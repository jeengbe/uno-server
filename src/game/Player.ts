import * as WebSocket from "ws";
import { MatchHandler } from "./MatchHandler";

export class Player {
  private readonly socket: WebSocket;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onMessage: (data: Record<string, any>) => boolean;

  constructor(socket: WebSocket) {
    this.socket = socket;

    this.onMessage = (): boolean => true;

    socket.onmessage = (e) => {
      try {
        const message = JSON.parse(e.data.toString());
        console.log("Message received: ");
        console.dir(message, { depth: null });
        if (!this.onMessage(message)) {
          throw new Error();
        }
      } catch (err) {
        this.disconnect();
      }
    };

    this.awaitAuth();
  }


  /**
   * Send a message to the client
   */
  private send(message: unknown) {
    this.socket?.send(JSON.stringify(message));
  }

  /**
   * Await authentication start
   */
  private awaitAuth() {
    this.onMessage = data => {
      if (data.method !== "auth" || !("username" in data)) {
        this.send({
          method: "auth",
          success: false
        });
      }
      this.send({
        method: "auth",
        success: true,
      });
      return true;
    };
  }

  private disconnect() {
    this.socket.close();
  }
}