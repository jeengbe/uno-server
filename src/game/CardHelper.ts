export const CardMask = {
  CARD_COLOR: 112 as const, // 111-0000
  CARD_VALUE: 15 as const, // 000-1111
};

export class CardHelper {
  public static readonly Value = {
    of: (card: number): number => (card & CardMask.CARD_VALUE),
    isNumeric: (card: number): boolean => (card & CardMask.CARD_VALUE) <= 9,
    isAction: (card: number): boolean => (card & CardMask.CARD_VALUE) >= 10,
    isPlusTwo: (card: number): boolean => (card & CardMask.CARD_VALUE) === 10,
    isNoU: (card: number): boolean => (card & CardMask.CARD_VALUE) === 11,
    isChangeColor: (card: number): boolean => (card & CardMask.CARD_VALUE) === 13,
    isPlusFour: (card: number): boolean => (card & CardMask.CARD_VALUE) === 14,

    isPlus: (card: number): boolean => CardHelper.Value.isPlusTwo(card) || CardHelper.Value.isPlusFour(card),
  };

  public static readonly Color = {
    of: (card: number): number => (card & CardMask.CARD_COLOR),
  };

  /**
   * Check whether a sequence of cards is a valid play
   * @param isInterjected Whether it is the player's turn or the card was interjected by another player
   * @param cards The played cards
   */
  public static isValidPlay(isInterjected: boolean, cards: number[], topCard: number, drawStreak: number): boolean {
    if (cards.length < 1) return false;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const previousCard = i === 0 ? topCard : cards[i - 1];
      const isFirstCard = i === 0;
      const isLastCard = i === cards.length - 1;

      // A numeric card may only be played if there is no draw streak active
      if (CardHelper.Value.isNumeric(card)) {
        if (drawStreak > 0) {
          return false;
        }
      }

      // A change color card may not end a play with a draw streak active
      if (CardHelper.Value.isChangeColor(card)) {
        if (drawStreak > 0 && isLastCard) {
          return false;
        }
      }

      // A change color card may not be interjected, unless the card before was a color change, too
      if (CardHelper.Value.isChangeColor(card)) {
        if (isFirstCard && isInterjected && CardHelper.Value.isChangeColor(previousCard)) {
          return false;
        }
      }

      // A change color card may only be succeeded by an action card and all following cards must be exactly the same or another change color
      if (CardHelper.Value.isChangeColor(card)) {
        if (!isLastCard) {
          if (!CardHelper.Value.isAction(cards[i + 1])) {
            return false;
          }
          if (cards.splice(i - 1).some(followingCard => followingCard !== cards[i + 1] && !CardHelper.Value.isChangeColor(followingCard))) {
            return false;
          }
        }
      }

      // A card my only be lay on a card of matching color or matching value
      if (CardHelper.Color.of(card) === CardHelper.Color.of(previousCard)) {
        continue;
      }
      if (CardHelper.Value.of(card) === CardHelper.Value.of(previousCard)) {
        continue;
      }
      return false;
    }

    return true;
  }
}