import { Player } from "./Player";
import { CardHelper } from "./CardHelper";

export class Match {
  public readonly ID: number;
  public name = "Unnamed match";
  public isRunning = false;

  /**
   * Players in the match and their number
   */
  private players: Player[] = [];

  /**
   * Each player's number
   */
  private playerNumbers: Map<Player, number> = new Map();

  /**
   * The highest player number in the match
   *
   * Used to determine the number of a new player
   */
  private maxPlayerNumber = 0;

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
   * Player number of the player whose turn it is
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
   */
  private hands: Map<Player, number[]> = new Map();

  /**
   * Whether the current player has already taken a card
   */
  public hasTakenCardAlready = false;

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
    const players: Record<number, PlayerData> = {};
    this.players.forEach(p => {
      if (p.ID !== player.ID) players[this.playerNumbers.get(p)!] = p.getData();
    });

    return {
      ID: this.ID,
      name: this.name,
      isMaster: this.master?.ID === player.ID,
      players: players
    };
  }

  public setName(name: string): void {
    this.name = name;
  }

  private broadcast(message: Protocol.ServerToClient | ((player: Player) => Protocol.ServerToClient), except?: Player): void {
    if (typeof message === "function") {
      for (const player of this.players) {
        if (typeof except !== "undefined") {
          if (player.ID === except.ID) continue;
        }
        player.send(message(player));
      }
    } else {
      for (const player of this.players) {
        if (typeof except !== "undefined") {
          if (player.ID === except.ID) continue;
        }
        player.send(message);
      }
    }
  }

  /**
   * @return The player's number
   */
  public addPlayer(player: Player): number {
    if (this.master === null) {
      this.master = player;
    }

    this.players.push(player);
    const playerNumber = this.maxPlayerNumber++;
    this.playerNumbers.set(player, playerNumber);
    this.hands.set(player, []);

    this.broadcast({
      method: "EVENT",
      event: "ADD_PLAYER",
      data: {
        player: player.getData(),
        playerNumber: playerNumber
      }
    }, player);

    return playerNumber;
  }

  public removePlayer(player: Player): void {
    this.players.splice(this.players.indexOf(player), 1);
    this.hands.delete(player);

    if (this.master?.ID === player.ID) {
      this.master = this.players[0] || null;

      this.master?.send({
        method: "EVENT",
        event: "PROMOTE"
      });
    }

    this.broadcast({
      method: "EVENT",
      event: "REMOVE_PLAYER",
      data: {
        playerNumber: this.playerNumbers.get(player)!
      }
    }, player);
  }

  /**
   * Begin the match, set the first player's turn
   */
  public start(): void {

    // Fill draw stack
    for (let color = 0; color < 4; color++) {
      // Card 0 and 15 only once
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
        stack: this.stack,
        cards: this.hands.get(player)!
      }
    }));

    this.isRunning = true;
    this.setTurn(0);
  }

  private setTurn(turn: number): void {
    this.turn = turn;
    this.broadcast({
      method: "EVENT",
      event: "SET_TURN",
      data: {
        turn: this.turn,
        drawStreak: this.drawStreak
      }
    });
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
    for (const player of this.players) {
      this.addCardsToPlayer(player, this.getRandomCardsFromDrawStack(6), false);
    }
  }

  /**
   * Add a card to the player's hand
   *
   * @param send Whether to send an event to the player (default: `true`)
   */
  public addCardsToPlayer(player: Player, cards: number[], send?: boolean): void {
    this.hands.get(player)?.push(...cards);
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
    return this.playerNumbers.has(player) ? this.playerNumbers.get(player)! : null;
  }

  public getPlayerByNumber(playerNumber: number): Player | null {
    let player = null;
    this.playerNumbers.forEach((n, p) => {
      if (n === playerNumber) player = p;
    });
    return player;
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
  public nextTurn(): void {
    let turn = this.turn;
    do {
      turn += this.turnDirection;
      turn %= this.maxPlayerNumber;
    } while (this.getPlayerByNumber(turn) === null);

    this.setTurn(turn);
    this.hasTakenCardAlready = false;
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
    const hand = this.hands.get(player)!;
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
          this.turn++;
          break;
        case CardHelper.Value.ACTION_NO_U:
          this.turnDirection *= -1;
          break;
      }
    }

    // Run backwards so that indices to splice remain the same
    for (const index of cardIndices.sort((a, b) => b - a)) {
      this.hands.get(player)!.splice(index, 1);
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

  /**
   * Take a card from the draw stack
   */
  public takeCard(player: Player): void {
    this.addCardsToPlayer(player, [this.getRandomCardFromDrawStack()], true);
    this.hasTakenCardAlready = true;
  }
}
