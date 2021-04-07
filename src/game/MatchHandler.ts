import { Match } from "./Match";
import { Player } from "./Player";

export class MatchHandler {
  private playerMatchList: Map<number, Match>;
  private matchList: Map<number, Match>;

  constructor() {
    this.matchList = new Map();
    this.playerMatchList = new Map();
  }

  public addMatch(match: Match): void {
    this.matchList.set(match.ID, match);
  }

  public getMatch(ID: number): Match | null {
    return this.matchList.get(ID) || null;
  }

  public listMatches(): MatchDataPublic[] {
    const data = [];
    for (const match of this.matchList.values()) {
      data.push(match.getDataPublic());
    }
    return data;
  }

  /**
   * Remove a player from all matches
   */
  public removePlayerFromCurrentMatch(player: Player): void {
    this.playerMatchList.get(player.ID)?.removePlayer(player);
    this.playerMatchList.delete(player.ID);
  }

  /**
   * Add a player to a match
   */
  public addPlayerToMatch(player: Player, match: Match): void {
    this.playerMatchList.set(player.ID, match);
  }

}