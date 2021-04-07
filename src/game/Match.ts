import { Player } from "./Player";

export class Match {
  public readonly ID: number;
  private name: string;
  private players: Map<number, Player>;

  constructor(ID: number) {
    this.ID = ID;
    this.name = "Unnamed match";
    this.players = new Map();
  }

  /**
   * Get publically available data for all players
   */
  public getDataPublic(): MatchDataPublic {
    return {
      ID: this.ID,
      name: this.name
    };
  }

  /**
   * Get data for players in the match
   */
  public getDataMatch(): MatchDataMatch {
    return {
      ID: this.ID,
      name: this.name,
    };
  }

  public setName(name: string): void {
    this.name = name;
  }

  private broadcast(message: Protocol.ServerToClient, except?: Player) {
    for (const player of this.players.values()) {
      if (typeof except !== "undefined") {
        if (player.ID === except.ID) continue;
      }
      player.send(message);
    }
  }

  public addPlayer(player: Player): void {
    this.players.set(player.ID, player);

    this.broadcast({
      method: "EVENT",
      event: "ADD_PLAYER",
      data: {
        player: player.getData()
      }
    }, player);
  }

  public removePlayer(player: Player): void {
    this.players.delete(player.ID);

    this.broadcast({
      method: "EVENT",
      event: "REMOVE_PLAYER",
      data: {
        playerID: player.ID
      }
    }, player);
  }
}