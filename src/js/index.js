window.version = 'v20230905T01:32:21.779Z';

import { GameBoard } from "./gameboard.js?v20230905T01:32:21.779Z";
import { ChatBox } from "./utils/chat.js?v20230905T01:32:21.779Z";
import { ScoreCard } from "./utils/score-card.js?v20230905T01:32:21.779Z";

customElements.define('score-card', ScoreCard);
customElements.define('chat-box', ChatBox);
customElements.define('game-board', GameBoard);
