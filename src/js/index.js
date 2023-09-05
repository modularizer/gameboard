window.version = 'v20230905T02:05:47.915Z';

import { GameBoard } from "./gameboard.js?v20230905T02:05:47.915Z";
import { ChatBox } from "./utils/chat.js?v20230905T02:05:47.915Z";
import { ScoreCard } from "./utils/score-card.js?v20230905T02:05:47.915Z";

customElements.define('score-card', ScoreCard);
customElements.define('chat-box', ChatBox);
customElements.define('game-board', GameBoard);
