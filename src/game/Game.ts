import * as WebSocket from "ws";
import * as http from "http";
import * as https from "https";
import * as chalk from "chalk";
import { MatchHandler } from "./MatchHandler";
import { Player } from "./Player";
import { Match } from "./Match";

export class Game {
  private readonly socket: WebSocket.Server;
  public readonly matchHandler: MatchHandler;
  private maxPlayerID = 0;

  public readonly playerList: Map<number, Player>;

  constructor(server: https.Server) {
    this.socket = new WebSocket.Server({ server });

    this.playerList = new Map();

    this.matchHandler = new MatchHandler();

    this.matchHandler.addMatch(new Match(0));
    this.matchHandler.addMatch(new Match(2));
    this.matchHandler.addMatch(new Match(1));
    this.matchHandler.getMatch(0)?.setName("My match 0");
    this.matchHandler.getMatch(1)?.setName("My match 1");
    this.matchHandler.getMatch(2)?.setName("My match 2");

    this.socket.on("connection", this.onConnection.bind(this));
  }

  private onConnection(socket: WebSocket, req: http.IncomingMessage) {
    console.log(chalk.bold(`\nConnection request: '${req.socket.remoteAddress}:${req.socket.remotePort}'`));
    const ID = this.getNextPlayerID();
    const player = new Player(socket, this, ID);
    console.log(chalk(`New Player has ID: ${ID}`));
    this.registerPlayer(player);
    player.ID = ID;
    player.connect();

    socket.onclose = () => this.disconnectPlayer(player);
  }

  public checkUsername(username: string): boolean {
    return true;
  }

  private getNextPlayerID() {
    return ++this.maxPlayerID;
  }

  /**
   * Add a player to the player map
   */
  private registerPlayer(player: Player) {
    this.playerList.set(player.ID, player);
  }

  /**
   * Remove a player from the player map and clean up
   */
  private disconnectPlayer(player: Player) {
    this.matchHandler.removePlayerFromCurrentMatch(player);
    this.playerList.delete(player.ID);
  }
}