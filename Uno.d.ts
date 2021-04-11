declare type MatchDataPublic = {
  ID: number;
  name: string;
};

declare type MatchDataMatch = {
  ID: number;
  name: string;
  players: Record<number, PlayerData>;
  isMaster: boolean;
};

declare type PlayerData = {
  ID: number,
  username: string;
};


declare namespace Protocol {
  type ClientToServer = {
    /**
     * Request authentication
     */
    method: "AUTH";
    username: string;
  } | {
    /**
     * List joinable matches
     */
    method: "LIST_MATCHES";
  } | {
    /**
     * Join a match
     */
    method: "JOIN_MATCH",
    data: {
      matchID: number;
    };
  } | {
    /**
     * Load data for the current match
     */
    method: "LOAD_MATCH_DATA";
  } | {
    /**
     * Start the currently playing match
     */
    method: "START_MATCH";
  };

  type ServerToClientEvent = {
    event: "ADD_PLAYER",
    data: {
      player: PlayerData;
      playerNumber: number;
    };
  } | {
    event: "REMOVE_PLAYER",
    data: {
      playerNumber: number;
    };
  } | {
    event: "START_MATCH",
    data: {
      /**
       * Card on the top of the stack
       */
      topCard: number;
      /**
       * Player's cards
       */
      cards: number[];
    };
  } | {
    // TODO: Implement
    event: "PUSH_STACK",
    data: {
      card: number;
    };
  } | {
    /**
     * Promote to match master
     */
    event: "PROMOTE";
  } | {
    /**
     * Add a card to the player
     */
    event: "ADD_CARD_TO_HAND";
    data: {
      card: number;
    };
  };

  type ServerToClient = ({
    method: "EVENT";
  } &
    ServerToClientEvent) | {
      /**
       * Connection okay, ready for authentication
       */
      method: "WELCOME";
    } | {
      /**
       * Authentification successful
       */
      method: "AUTH";
    } | {
      method: "LIST_MATCHES";
      data: {
        matches: MatchDataPublic[];
      };
    } | {
      /**
       * Match join successful
       */
      method: "JOIN_MATCH";
    } | {
      /**
       * Loaded data of the current match
       */
      method: "LOAD_MATCH_DATA";
      data: {
        match: MatchDataMatch;
      };
    } | {
      /**
       * Start match confirm
       */
      method: "START_MATCH";
    };
}