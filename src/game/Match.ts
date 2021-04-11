import { Game } from "./Game";
import { Player } from "./Player";
import { CardHelper } from "./CardHelper";

export class Match {
  private readonly game: Game;
  public readonly ID: number;
  private name = "Unnamed match";
  public isRunning = false;

  /**
   * Players in the match
   */
  private players: Player[] = [];

  /**
   * Numbers of the players in the match
   * @key Player's turn number
   * @value Player
   */
  private turnNumbers: Map<number, Player> = new Map();

  /**
   * The highest player number in the match
   *
   * Used to determine the number of a new player
   */
  private maxPlayerTurn = 0;

  /**
   * Cards to draw from
   */
  private drawStack: number[] = [];

  /**
   * Player who is in control of the game (May start, pause, etc.)
   */
  private master: Player | null = null;

  /**
   * Index of `Match.players` of the player whose turn it is
   */
  private turn = 0;

  /**
   * Cards that lay on the table
   */
  private stack: number[] = [];

  /**
   * The current draw streak
   */
  private drawStreak = 0;

  /**
   * Each player's cards
   * @key Player ID
   * @value Cards
   */
  private hands: Map<number, number[]> = new Map();

  constructor(game: Game, ID: number) {
    this.game = game;
    this.ID = ID;
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
  public getDataMatch(player: Player): MatchDataMatch {
    return {
      ID: this.ID,
      name: this.name,
      isMaster: this.master?.ID === player.ID,
      players: Object.assign({}, ...Array.from(this.turnNumbers.entries()).filter(([_turn, player]) => player.ID !== player.ID).map(([turn, player]) => ({ [turn]: player.getData() })))
    };
  }

  /**
   * Get currently playing players
   */
  public getPlayers(): Player[] {
    return this.players;
  }

  public setName(name: string): void {
    this.name = name;
  }

  private broadcast(message: Protocol.ServerToClient | ((player: Player) => Protocol.ServerToClient), except?: Player): void {
    if (typeof message === "function") {
      for (const player of this.getPlayers()) {
        if (typeof except !== "undefined") {
          if (player.ID === except.ID) continue;
        }
        player.send(message(player));
      }
    } else {
      for (const player of this.getPlayers()) {
        if (typeof except !== "undefined") {
          if (player.ID === except.ID) continue;
        }
        player.send(message);
      }
    }
  }

  public addPlayer(player: Player): void {
    if (this.master === null) {
      this.master = player;
    }

    this.players.push(player);
    const turn = ++this.maxPlayerTurn;
    this.turnNumbers.set(turn, player);
    this.hands.set(player.ID, []);

    this.broadcast({
      method: "EVENT",
      event: "ADD_PLAYER",
      data: {
        player: player.getData(),
        playerNumber: turn
      }
    }, player);
  }

  public removePlayer(player: Player): void {
    this.players.splice(this.players.indexOf(player), 1);

    if (this.master?.ID === player.ID) {
      this.master = this.players[0] || null;

      this.master?.send({
        method: "EVENT",
        event: "PROMOTE"
      });
    }

    this.hands.delete(player.ID);
    const turn = this.getTurnNumberOfPlayer(player)!;
    this.turnNumbers.delete(turn);

    this.broadcast({
      method: "EVENT",
      event: "REMOVE_PLAYER",
      data: {
        playerNumber: turn
      }
    }, player);
  }

  /**
   * Begin the match, set the first player's turn
   */
  public start(): void {

    // Fill draw stack
    for (let color = 0; color < 4; color++) {
      for (let value = 0; value < 15; value++) {
        this.drawStack.push(color << 4 | value);
      }
      for (let value = 1; value < 14; value++) {
        this.drawStack.push(color << 4 | value);
      }
    }

    // Generate a random card to start the game with (0-9, all colors)
    const startingCard = this.getRandomCardFromDrawStack(false);
    this.stack.push(startingCard);

    this.generateStartingHandCards();

    this.broadcast(player => ({
      method: "EVENT",
      event: "START_MATCH",
      data: {
        topCard: startingCard,
        cards: this.hands.get(player.ID)!
      }
    }));

    this.isRunning = true;

    this.turn = 0;
  }

  /**
   * Get a random card from the draw stack
   *
   * @param actions Whether to include action cards (default: `true`)
   * @param remove Whether to remove the card from the draw stack (default: `true`)
   */
  public getRandomCardFromDrawStack(actions?: boolean, remove?: boolean): number {
    let card, index;
    do {
      index = Math.floor(Math.random() * this.drawStack.length);
      card = this.drawStack[index];
    } while (actions === false && (card & 15) > 9);

    if (remove !== false) {
      this.drawStack.splice(index, 1);
    }

    return card;
  }

  /**
   * Generate starting cards for all players
   */
  private generateStartingHandCards(): void {
    for (const player of this.turnNumbers.values()) {
      for (let i = 0; i < 6; i++) {
        this.addCardToPlayer(player, this.getRandomCardFromDrawStack());
      }
    }
  }

  /**
   * Add a card to the player's hand
   */
  public addCardToPlayer(player: Player, card: number): void {
    this.hands.get(player.ID)?.push(card);
    player.send({
      method: "EVENT",
      event: "ADD_CARD_TO_HAND",
      data: {
        card: card
      }
    });
  }

  /**
   * Remove a card from the player's hand
   *
   * @param cardIndex **Index of the card in the player's hand** (Due to the possiblity of having the same card multiple times)
   */
  public removeCardFromPlayerByIndex(player: Player, cardIndex: number): void {
    this.hands.get(player.ID)?.splice(cardIndex, 1);
  }

  /**
   * Add a card to the stack and broadcast to all players
   */
  public addCardToStack(card: number): void {
    this.stack.push(card);
    this.broadcast({
      method: "EVENT",
      event: "PUSH_STACK",
      data: {
        card: card
      }
    });
  }

  /**
   * Check whether a player is the match master
   */
  public isMaster(player: Player): boolean {
    return this.master === player;
  }

  /**
   * Get a player's turn number
   */
  public getTurnNumberOfPlayer(player: Player): number | null {
    return Array.from(this.turnNumbers.keys()).find(number => this.turnNumbers.get(number) === player) || null;
  }

  /**
   * Check whether it's a player's turn
   */
  public isPlayersTurn(player: Player): boolean {
    return this.getTurnNumberOfPlayer(player) === this.turn;
  }

  public getTopCard(): number | null {
    return this.stack[this.stack.length - 1] || null;
  }

  /**
   * Play a single card or a sequence of cards as a player
   * @return Whether the play is valid
   */
  public playerPlayCards(player: Player, ...cards: number[]): boolean {
    if (!CardHelper.isValidPlay(!this.isPlayersTurn(player), cards, this.getTopCard()!, this.drawStreak)) {
      return false;
    }
    // By here, we know that according to our magic rule set, the play is valid



    return true;
  }
}
