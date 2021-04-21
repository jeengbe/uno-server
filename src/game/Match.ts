import { Game } from "./Game";
import { Player } from "./Player";
import { CardHelper } from "./CardHelper";

export class Match {
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
   * Which direction the turn is going
   *
   * `-1` means backward, `1` means forward
   */
  private turnDirection = 1;

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

  constructor(ID: number) {
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
        playerID: turn
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
   * Put the cards from the stack back into the draw stack
   */
  private blendStack(): void {
    this.drawStack.push(...this.stack);
    this.stack = [];
  }

  /**
   * Get a random card from the draw stack
   *
   * @param actions Whether to include action cards (default: `true`)
   * @param remove Whether to remove the card from the draw stack (default: `true`)
   */
  public getRandomCardFromDrawStack(actions?: boolean, remove?: boolean): number {
    if (this.drawStack.length === 0) {
      this.blendStack();
    }

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

  public getRandomCardsFromDrawStack(count: number, actions?: boolean, remove?: boolean): number[] {
    return new Array(count).fill(null).map(() => this.getRandomCardFromDrawStack(actions, remove));
  }

  /**
   * Generate starting cards for all players
   */
  private generateStartingHandCards(): void {
    for (const player of this.turnNumbers.values()) {
      this.addCardsToPlayer(player, this.getRandomCardsFromDrawStack(6), false);
    }
  }

  /**
   * Add a card to the player's hand
   *
   * @param send Whether to send an event to the player (default: `true`)
   */
  public addCardsToPlayer(player: Player, cards: number[], send?: boolean): void {
    this.hands.get(player.ID)?.push(...cards);
    if (send !== false) {
      player.send({
        method: "EVENT",
        event: "ADD_CARDS_TO_HAND",
        data: {
          cards: cards
        }
      });
    }
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
        cards: [card]
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
   * Increments `this.turn` to the next player
   */
  private nextTurn(): void {
    do {
      this.turn += this.turnDirection;
      this.turn = this.turn % this.players.length;
    } while (typeof this.players[this.turn] !== "undefined");
    this.broadcast({
      method: "EVENT",
      event: "SET_TURN",
      data: {
        turn: this.turn
      }
    });
  }

  /**
   * Take up the draw streak as a player and next turn
   */
  public playerTakeDrawStreak(player: Player): void {
    this.addCardsToPlayer(player, this.getRandomCardsFromDrawStack(this.drawStreak));
    this.drawStreak = 0;
    this.nextTurn();
  }

  /**
   * Play a single card or a sequence of cards as a player
   *
   * @param cardIndices Indices of the cards to play in the player's hand
   * @return Whether the play is valid
   */
  public playerPlayCards(player: Player, cardIndices: number[]): boolean {
    const hand = this.hands.get(player.ID)!;
    if (cardIndices.some(index => index >= hand.length)) {
      player.kick("Invalid card indices");
      return false;
    }

    const cards = cardIndices.map(index => hand[index]);

    if (!CardHelper.isValidPlay(!this.isPlayersTurn(player), this.getTopCard()!, this.drawStreak, cards)) {
      return false;
    }

    for (const card of cards) {
      this.stack.push(card);
      switch (CardHelper.Value.of(card)) {
        case CardHelper.Value.ACTION_PLUS_TWO:
          this.drawStreak += 2;
          break;
        case CardHelper.Value.ACTION_PLUS_FOUR:
          this.drawStreak += 4;
          break;
        case CardHelper.Value.ACTION_SKIP:
          this.nextTurn();
          break;
        case CardHelper.Value.ACTION_NO_U:
          this.turnDirection *= -1;
          break;
      }
    }

    // Run backwards so that indices to splice remain the same
    for (const index of cardIndices.sort((a, b) => b - a)) {
      this.hands.get(player.ID)!.splice(index, 1);
    }

    this.broadcast({
      method: "EVENT",
      event: "PUSH_STACK",
      data: {
        cards: cards
      }
    });
    this.nextTurn();

    return true;
  }
}
