import * as WebSocket from "ws";
import * as http from "http";
import * as https from "https";
import { MatchHandler } from "./MatchHandler";
import { Player } from "./Player";
import { Match } from "./Match";

export class Game {
  private readonly socket: WebSocket.Server;
  public readonly matchHandler: MatchHandler;

  public readonly playerList: Map<number, Player>;

  constructor(server: https.Server) {
    this.socket = new WebSocket.Server({ server });

    this.playerList = new Map();

    this.matchHandler = new MatchHandler();

    this.matchHandler.addMatch(new Match(0));
    this.matchHandler.addMatch(new Match(2));
    this.matchHandler.addMatch(new Match(1));
    this.matchHandler.getMatch(1)?.setName("My Match");

    this.socket.on("connection", this.onConnection.bind(this));
  }

  private onConnection(socket: WebSocket, req: http.IncomingMessage) {
    console.log(`Connection request: '${req.socket.remoteAddress}:${req.socket.remotePort}'`);
    const ID = this.nextPlayerID();
    const player = new Player(socket, this, ID);
    this.registerPlayer(player);
    player.ID = ID;
    player.connect();
  }

  public checkUsername(username: string): boolean {
    return username === "Jesper";
  }

  private nextPlayerID() {
    let ID = 0;
    for (const [key] of this.playerList) {
      ID = Math.max(ID, key);
    }
    ID++;
    return ID;
  }

  /**
   * Add a player to the player map
   */
  private registerPlayer(player: Player) {
    this.playerList.set(player.ID, player);
  }
}