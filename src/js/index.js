window.version = 'v20230905T02:38:43.752Z';

import { GameBoard } from "./gameboard.js?v20230905T02:38:43.752Z";
import { ChatBox } from "./utils/chat.js?v20230905T02:38:43.752Z";
import { ScoreCard } from "./utils/score-card.js?v20230905T02:38:43.752Z";

customElements.define('score-card', ScoreCard);
customElements.define('chat-box', ChatBox);
customElements.define('game-board', GameBoard);
