import * as WebSocket from "ws";
import { Game } from "./Game";
import { Match } from "./Match";

export class Player {
  public ID: number;
  public username: string | null;

  private readonly socket: WebSocket;
  private readonly game: Game;
  private onMessage: ((data: Record<string, unknown>) => void) | null = null;
  private methodHandlers: Map<Protocol.ClientToServer["method"], ((data: Record<string, unknown>) => void)>;

  private currentMatch: Match | null;

  constructor(socket: WebSocket, game: Game, ID: number) {
    this.socket = socket;
    this.game = game;

    this.methodHandlers = new Map();
    this.ID = ID;
    this.username = null; // Will overwrite in auth
    this.currentMatch = null;

    // Handle incoming message
    socket.onmessage = e => {
      try {
        const message = JSON.parse(e.data.toString());
        console.log("\nMessage received: ");
        console.dir(message, { depth: null });
        if (typeof message !== "object" || Array.isArray(message) || message === null) return this.kick("Invalid message");

        if (!("method" in message)) return this.kick("Missing key 'method'");
        if (typeof message.method !== "string") return this.kick("Invalid 'method' type");
        const method = message.method;

        try {
          if (this.onMessage !== null) this.onMessage(message);
          if (this.methodHandlers.has(method)) this.methodHandlers.get(method)!(message.data || {});
        } catch (err) {
          // Runtime error handling message
          console.error(err);
        }
      } catch (err) {
        // Error decoding JSON
        return this.kick("Invalid message");
      }
    };
  }

  /**
   * Send a message to the client
   */
  public send(message: Protocol.ServerToClient): void {
    console.log("\nSend message:");
    console.dir(message, { depth: null });
    this.socket?.send(JSON.stringify(message));
  }


  /**
   * Init the connection
   */
  public async connect(): Promise<void> {
    this.send({
      method: "WELCOME"
    });

    // Await player authentication
    try {
      await new Promise<void>((resolve, reject: (reason: string) => void) => {
        this.onMessage = data => {
          this.onMessage = null;

          if (data.method !== "AUTH") return reject("Awaiting authentication");
          if (!("username" in data)) return reject("Missing key 'username'");
          if (typeof data.username !== "string") return reject("Invalid 'username' type");

          this.username = data.username;
          if (!this.game.checkUsername(this.username)) return reject("Invalid username");

          // Authentification successful
          this.send({
            method: "AUTH",
          });
          resolve();
        };
      });
    } catch (err) {
      // Authentification error
      return void this.kick(err);
    }

    // Attach miscellaneous handlers
    // List all available matches
    this.methodHandlers.set("LIST_MATCHES", () => {
      this.send({
        method: "LIST_MATCHES",
        data: {
          matches: this.game.matchHandler.listMatches()
        }
      });
    });

    /**
     * Join a match
     */
    this.methodHandlers.set("JOIN_MATCH", data => {
      if (!("matchID" in data)) return this.kick("Missing key 'matchID'");
      if (typeof data.matchID !== "number") return this.kick("Invalid 'matchID' type");

      this.game.matchHandler.removePlayerFromCurrentMatch(this);

      const match = this.game.matchHandler.getMatch(data.matchID);
      if (match === null) return this.kick("Invalid 'matchID'");

      this.game.matchHandler.addPlayerToMatch(this, match);

      this.send({
        method: "JOIN_MATCH"
      });
    });

    /**
     * Load data for the current match
     */
    this.methodHandlers.set("LOAD_MATCH_DATA", () => {
      if (this.currentMatch === null) return this.kick("Not in match");

      this.send({
        method: "LOAD_MATCH_DATA",
        data: {
          match: this.currentMatch.getDataMatch()
        }
      });
    });
  }

  /**
   * Get public broadcastable data about the player
   */
  public getData(): PlayerData {
    if (this.username === null) throw new Error("Not authenticated");

    return {
      ID: this.ID,
      username: this.username
    };
  }

  private kick(reason?: string): false {
    console.log("Kick client" + (typeof reason !== undefined ? " with reason: " + reason : ""));
    this.socket.close();
    return false;
  }
}
