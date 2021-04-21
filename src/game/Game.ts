import * as WebSocket from "ws";
import * as https from "https";
import * as chalk from "chalk";
import { Player } from "./Player";
import { Match } from "./Match";


/**
 * A game is basically a lobby that keeps track of its matches and all currently logged in players.
 */
export class Game {
  private readonly socket: WebSocket.Server;

  /**
   * The highest player ID
   *
   * Used to determine the ID of new players
   */
  private maxPlayerID = 0;

  /**
   * A list of all connected players
   * @key The player's ID
   * @value The player object
   */
  private readonly playerList: Map<number, Player> = new Map();

  /**
   * A list of all current matches
   * @key The match's ID
   * @value The match object
   */
  private readonly matchList: Map<number, Match> = new Map();

  constructor(server: https.Server) {
    // Bind to server
    this.socket = new WebSocket.Server({ server });
    this.socket.on("connection", (socket, req) => {
      console.log(chalk.bold(`\nNew connection: '${req.socket.remoteAddress}:${req.socket.remotePort}'`));
      this.handleNewConnection(socket);
    });

    // Init matches
    this.addMatch(new Match(0));
    this.addMatch(new Match(2));
    this.addMatch(new Match(1));
    this.getMatch(0)?.setName("My match 0");
    this.getMatch(1)?.setName("My match 1");
    this.getMatch(2)?.setName("My match 2");
  }

  /**
   * Handle a new client connection
   */
  private handleNewConnection(socket: WebSocket) {
    const ID = ++this.maxPlayerID;
    const player = new Player(socket, this, ID);

    this.registerPlayer(player);
    socket.onclose = () => this.disconnectPlayer(player);
  }

  /**
   * Check whether an username is valid
   */
  public isUsernameValid(username: string): boolean {
    return (username[0] || null) === "#";
  }

  /**
   * Add a player to the player map and welcome them
   */
  private registerPlayer(player: Player) {
    this.playerList.set(player.ID, player);
    console.log(chalk(`New Player has ID: ${player.ID}`));
    player.welcome();
  }

  /**
   * Get a player by their ID
   */
  public getPlayerByID(playerID: number): Player | null {
    return this.playerList.get(playerID) || null;
  }

  /**
   * Remove a player from the player map and clean up
   */
  private disconnectPlayer(player: Player) {
    console.log(chalk.bold(`\nPlayer ${player.ID} has disconnected`));

    player.getCurrentMatch()?.removePlayer(player);
    this.playerList.delete(player.ID);
  }

  /**
   * Add a match to the list
   */
  private addMatch(match: Match) {
    this.matchList.set(match.ID, match);
  }

  /**
   * Get a match by its ID
   */
  public getMatch(matchID: number): Match | null {
    return this.matchList.get(matchID) || null;
  }

  /**
   * Return all matches
   */
  public getAllMatches(): Match[] {
    return Array.from(this.matchList.values());
  }
}