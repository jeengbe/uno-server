import * as chalk from "chalk";

export const CardMask = {
  CARD_COLOR: 112 as const, // 111-0000
  CARD_VALUE: 15 as const, // 000-1111
};

export class CardHelper {
  public static readonly Value = {
    of: (card: number): number => (card & CardMask.CARD_VALUE),
    isNumeric: (card: number): boolean => (card & CardMask.CARD_VALUE) <= 9,
    isAction: (card: number): boolean => (card & CardMask.CARD_VALUE) >= 10,
    isPlusTwo: (card: number): boolean => (card & CardMask.CARD_VALUE) === CardHelper.Value.ACTION_PLUS_TWO,
    isNoU: (card: number): boolean => (card & CardMask.CARD_VALUE) === CardHelper.Value.ACTION_NO_U,
    isChangeColor: (card: number): boolean => (card & CardMask.CARD_VALUE) === CardHelper.Value.ACTION_CHANGE_COLOR,
    isPlusFour: (card: number): boolean => (card & CardMask.CARD_VALUE) === CardHelper.Value.ACTION_PLUS_FOUR,

    isPlus: (card: number): boolean => CardHelper.Value.isPlusTwo(card) || CardHelper.Value.isPlusFour(card),
    isMulticolor: (card: number): boolean => CardHelper.Value.isChangeColor(card) || CardHelper.Value.isPlusFour(card),

    ACTION_PLUS_TWO: 10 as const,
    ACTION_NO_U: 11 as const,
    ACTION_SKIP: 12 as const,
    ACTION_CHANGE_COLOR: 13 as const,
    ACTION_PLUS_FOUR: 14 as const,
  };

  public static readonly Color = {
    of: (card: number): number => (card & CardMask.CARD_COLOR),

    RED: 0 as const,
    GREEN: 1 as const,
    BLUE: 2 as const,
    YELLOW: 3 as const,
  };

  /**
   * Check whether a sequence of cards is a valid play
   * @param isInterjected Whether it is the player's turn or the card was interjected by another player
   * @param cards The played cards
   */
  public static isValidPlay(isInterjected: boolean, topCard: number, drawStreak: number, cards: number[]): boolean {
    console.log("Checking Play", { isInterjected: isInterjected, topCard: topCard, drawStreak: drawStreak, cards: cards });
    if (cards.length < 1) return false;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const previousCard = i === 0 ? topCard : cards[i - 1];
      const isFirstCard = i === 0;
      const isLastCard = i === cards.length - 1;

      // A numeric card may only be played if there is no draw streak active
      if (CardHelper.Value.isNumeric(card)) {
        if (drawStreak > 0) {
          console.error(chalk.red("1 A numeric card may only be played if there is no draw streak active"));
          return false;
        }
      }

      // A change color card may not end a play with a draw streak active
      if (CardHelper.Value.isChangeColor(card)) {
        if (drawStreak > 0 && isLastCard) {
          console.error(chalk.red("2 A change color card may not end a play with a draw streak active"));
          return false;
        }
      }

      // A change color card may not proceed a non-change-color card
      if (CardHelper.Value.isChangeColor(card)) {
        if (!isFirstCard && !CardHelper.Value.isChangeColor(previousCard)) {
          console.error(chalk.red("3 A change color card may not proceed a non-change-color card"));
          return false;
        }
      }

      // A change color card may not be interjected, unless the card before was a color change, too
      if (CardHelper.Value.isChangeColor(card)) {
        if (isFirstCard && isInterjected && !CardHelper.Value.isChangeColor(previousCard)) {
          console.error(chalk.red("4 A change color card may not be interjected, unless the card before was a color change, too"));
          return false;
        }
      }

      // A change color card may only be succeeded by zero or more change color cards followed by zero or more identical action cards, and only if a draw streak is active
      if (CardHelper.Value.isChangeColor(card)) {
        if (!isLastCard) {
          for (let j = i; j < cards.length; j++) {
            if (CardHelper.Value.isChangeColor(cards[j])) {
              /// A change color card may only be preceeded by none or a change color card
              if (j === 0 || CardHelper.Value.isChangeColor(cards[j - 1])) {
                continue;
              }
            } else {
              /// All other cards must be action cards and may only succeeded a change color or the same card
              if (!CardHelper.Value.isAction(cards[j]) || (!CardHelper.Value.isChangeColor(cards[j - 1]) && cards[j - 1] != cards[j])) {
                console.error(chalk.red("5 A change color card may only be succeeded by zero or more change color cards followed by zero or more identical action cards"));
                return false;
              }
              if (drawStreak == 0) {
                console.error(chalk.red("6 A card combination amy only be lay with an active draw streak"));
                return false;
              }
            }
          }
        }
      }

      // The first card my only be lay on a card of matching color or matching value
      // Alternatively, a multicolor card may be lay on any color
      if (CardHelper.Color.of(card) === CardHelper.Color.of(previousCard) || CardHelper.Value.isMulticolor(card)) {
        continue;
      }
      if (CardHelper.Value.of(card) === CardHelper.Value.of(previousCard)) {
        continue;
      }

      console.error(chalk.red("6 A card my only be lay on a card of matching color or matching value"));
      console.error(chalk.red("  Alternatively, a multicolor card may be lay on any color"));
      return false;
    }

    console.log("Valid play");
    return true;
  }

  /**
   * Return the card for the given color and value
   */
  public static buildCard(color: number, value: number): number {
    return color << 4 | value;
  }
}