import { Player } from "./Player";

export class Match {
  public readonly ID: number;
  private name: string;
  private players: Map<number, Player>;
  public isRunning: boolean;

  /**
   * Cards to draw from
   */
  private drawStack: number[];

  /**
   * Player who is in control of the game (May start, pause, etc.)
   */
  private master: Player | null;

  /**
   * Index of `Match.players` of the player whose turn it is
   */
  private turn;

  /**
   * Cards that lay on the table
   */
  private stack: number[];

  /**
   * Each player's cards (Key: Player ID)
   */
  private hands: Map<number, number[]>;


  constructor(ID: number) {
    this.ID = ID;
    this.name = "Unnamed match";
    this.players = new Map();
    this.stack = [];
    this.hands = new Map();
    this.turn = 0;
    this.master = null;
    this.isRunning = false;
    this.drawStack = [];
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
   * Get data for players waiting for the match to start
   */
  public getDataWaiting(player: Player): MatchDataWaiting {
    return {
      ID: this.ID,
      name: this.name,
      isMaster: this.master?.ID === player.ID
    };
  }

  public setName(name: string): void {
    this.name = name;
  }

  private broadcast(message: Protocol.ServerToClient | ((player: Player) => Protocol.ServerToClient), except?: Player): void {
    if (typeof message === "function") {
      for (const player of this.players.values()) {
        if (typeof except !== "undefined") {
          if (player.ID === except.ID) continue;
        }
        player.send(message(player));
      }
    } else {
      for (const player of this.players.values()) {
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

    this.players.set(player.ID, player);
    this.hands.set(player.ID, []);

    this.broadcast({
      method: "EVENT",
      event: "ADD_PLAYER",
      data: {
        player: player.getData()
      }
    }, player);
  }

  public removePlayer(player: Player): void {
    if (this.master?.ID === player.ID) {
      this.master = this.players.keys().next().value;
    }

    this.players.delete(player.ID);
    this.hands.delete(player.ID);

    this.broadcast({
      method: "EVENT",
      event: "REMOVE_PLAYER",
      data: {
        playerID: player.ID
      }
    }, player);
  }

  /**
   * Begin the match, set the first player's turn
   */
  public start(): void {

    for (let color = 0; color < 4; color++) {
      for (let value = 0; value < 15; value++) {
        this.drawStack.push(color << 4 | value);
      }
    }

    const startingCard = this.getRandomCardFromDrawStack();
    // Generate a random card to start the game with (0-9, all colors)
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
    for (const player of this.players.values()) {
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
}
