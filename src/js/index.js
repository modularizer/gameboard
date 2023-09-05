window.version = 'v20230905T01:23:51.551Z';

import { GameBoard } from "./gameboard.js?v20230905T01:23:51.551Z";
import { ChatBox } from "./utils/chat.js?v20230905T01:23:51.551Z";
import { ScoreCard } from "./utils/score-card.js?v20230905T01:23:51.551Z";

customElements.define('score-card', ScoreCard);
customElements.define('chat-box', ChatBox);
customElements.define('game-board', GameBoard);
