import * as WebSocket from "ws";
import * as chalk from "chalk";
import { Game } from "./Game";
import { Match } from "./Match";

export class Player {
  public ID: number;
  public username: string | null;
  private currentMatch: Match | null;

  private readonly socket: WebSocket;
  private readonly game: Game;
  /**
   * Priority handler for an incoming message
   */
  private messageHandler: ((data: Record<string, unknown>) => void) | null;
  private methodHandlers: Map<Protocol.ClientToServer["method"], ((data: Record<string, unknown>) => void)>;


  constructor(socket: WebSocket, game: Game, ID: number) {
    this.socket = socket;
    this.game = game;

    this.ID = ID;
    this.username = null; // Will overwrite in auth
    this.currentMatch = null;

    this.messageHandler = null;
    this.methodHandlers = new Map();

    // Handle incoming message
    socket.onmessage = e => {
      try {
        const message = JSON.parse(e.data.toString());
        console.log(chalk.underline(`\n\nServer <- Client (${this.ID})`));
        console.dir(message, { depth: null });
        if (typeof message !== "object" || Array.isArray(message) || message === null) return this.kick("Invalid message");

        if (!("method" in message)) return this.kick("Missing key 'method'");
        if (typeof message.method !== "string") return this.kick("Invalid 'method' type");
        const method = message.method;

        try {
          if (this.messageHandler !== null) this.messageHandler(message);
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
    console.log(chalk.underline(`\nServer -> Client (${this.ID})`));
    console.dir(message, { depth: null });
    this.socket.send(JSON.stringify(message));
  }

  /**
   * Start authentication process
   */
  public async welcome(): Promise<void> {
    this.send({
      method: "WELCOME"
    });

    // Await player authentication
    try {
      await new Promise<void>((resolve, reject: (reason: string) => void) => {
        this.messageHandler = data => {
          this.messageHandler = null;

          if (data.method !== "AUTH") return reject("Awaiting authentication");
          if (!("username" in data)) return reject("Missing key 'username'");
          if (typeof data.username !== "string") return reject("Invalid 'username' type");

          this.username = data.username;
          if (!this.game.isUsernameValid(this.username)) return reject("Invalid username");

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

    this.attachLobbyHandlers();
  }

  /**
   * Attach incoming message handlers for the lobby
   */
  private attachLobbyHandlers() {
    /**
     * List all available matches
     */
    this.methodHandlers.set("LIST_MATCHES", () => {
      this.send({
        method: "LIST_MATCHES",
        data: {
          matches: this.game.getAllMatches().map(match => match.getDataPublic())
        }
      });
    });

    /**
     * Join a match
     */
    this.methodHandlers.set("JOIN_MATCH", data => {
      if (!("matchID" in data)) return this.kick("Missing key 'matchID'");
      if (typeof data.matchID !== "number") return this.kick("Invalid 'matchID' type");

      const match = this.game.getMatch(data.matchID);
      if (match === null) return this.kick("Invalid match ID");
      if (match.isRunning) return this.kick("Match already running");

      this.joinMatch(match);

      this.send({
        method: "JOIN_MATCH"
      });
    });

  }

  /**
   * Detach handlers for the lobby
   */
  private detachLobbyHandlers() {
    this.methodHandlers.delete("LIST_MATCHES");
    this.methodHandlers.delete("JOIN_MATCH");
  }

  /**
   * Attach incoming message handlers for a match
   */
  private attachMatchHandlers() {
    /**
     * Load data for the current match
     */
    this.methodHandlers.set("LOAD_MATCH_DATA", () => {
      if (this.currentMatch === null) return this.kick("Not in a match");

      this.send({
        method: "LOAD_MATCH_DATA",
        data: {
          match: this.currentMatch.getDataMatch(this)
        }
      });
    });

    /**
     * Start the currently playing match
     */
    this.methodHandlers.set("START_MATCH", () => {
      if (this.currentMatch === null) return this.kick("Not in a match");
      if (!this.currentMatch.isMaster(this)) return this.kick("No permission");
      if (this.currentMatch.isRunning) return this.kick("Already running");

      this.send({
        method: "START_MATCH"
      });
      this.currentMatch.start();
    });
  }

  /**
   * Detach handlers for a match
   */
  private detachMatchHandlers() {
    this.methodHandlers.delete("LOAD_MATCH_DATA");
    this.methodHandlers.delete("START_MATCH");
  }

  /**
   * Join a match
   */
  private joinMatch(match: Match) {
    this.currentMatch = match;
    match.addPlayer(this);
    this.detachLobbyHandlers();
    this.attachMatchHandlers();
  }

  /**
   * Leave the currently playing match
   */
  private leaveCurrentMatch() {
    this.currentMatch?.removePlayer(this);
    this.currentMatch = null;
    this.detachMatchHandlers();
    this.attachLobbyHandlers();
  }

  public getCurrentMatch(): Match | null {
    return this.currentMatch;
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

  /**
   * @returns `false`
   */
  private kick(reason?: string): false {
    console.log(chalk.underline("\nKick Client (" + this.ID + ")" + (typeof reason !== undefined ? " with reason: " + reason : "")));
    this.socket.close();
    return false;
  }
}
