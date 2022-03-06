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
  type ClientToServerEvent = never;
  // type ClientToServerEvent = {
  //   event: "PLAY_CARDS",
  //   data: {
  //     cardIndices: number[];
  //   };
  // };

  type ClientToServer = ({
    method: "EVENT";
  } &
    ClientToServerEvent) | {
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
    } | {
      /**
       * Play a single or a sequence of cards
       */
      method: "PLAY_CARDS";
      data: {
        cards: number[];
      };
    } | {
      /**
       * Pick up a card from the draw stack
       */
      method: "TAKE_CARD";
    } | {
      /**
       * Next turn
       */
      method: "SKIP";
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
       * Cards on stack
       */
      stack: number[];
      /**
       * Player's cards
       */
      cards: number[];
    };
  } | {
    /**
     * Add a number of cards to the stack
     */
    // TODO: Implement
    event: "PUSH_STACK",
    data: {
      cards: number[];
    };
  } | {
    /**
     * Promote to match master
     */
    event: "PROMOTE";
  } | {
    /**
     * Add cards to the player
     */
    event: "ADD_CARDS_TO_HAND";
    data: {
      cards: number[];
    };
  } | {
    /**
     * Set whose turn it is
     */
    event: "SET_TURN";
    data: {
      turn: number;
      drawStreak: number;
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
      data: {
        /**
         * The player's turn number
         */
        turnNumber: number;
      };
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
    } | {
      /**
       * Play confirmation
       */
      method: "PLAY_CARDS";
      data: {
        /**
         * Whether the play is valid
         */
        valid: boolean;
      };
    } | {
      /**
       * Confirmation for taking a card
       */
      method: "TAKE_CARD";
    };
}