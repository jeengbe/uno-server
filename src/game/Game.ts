import * as WebSocket from "ws";
import * as http from "http";
import * as https from "https";
import { MatchHandler } from "./MatchHandler";
import { Player } from "./Player";

export class Game {
  private readonly socket: WebSocket.Server;
  private readonly matchHandler: MatchHandler;

  constructor(server: https.Server) {
    this.socket = new WebSocket.Server({ server });

    this.matchHandler = new MatchHandler();

    this.socket.on("connection", this.onConnection);
  }

  private onConnection(socket: WebSocket, req: http.IncomingMessage) {
    console.log(`Connection request: '${req.socket.remoteAddress}:${req.socket.remotePort}'`);
    const player = new Player(socket);
  }
}