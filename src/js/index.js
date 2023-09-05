window.version = 'v20230905T00:23:45.542Z';

import { GameBoard } from "./gameboard.js?v20230905T00:23:45.542Z";
import { ChatBox } from "./utils/chat.js?v20230905T00:23:45.542Z";
import { ScoreCard } from "./utils/score-card.js?v20230905T00:23:45.542Z";

customElements.define('score-card', ScoreCard);
customElements.define('chat-box', ChatBox);
customElements.define('game-board', GameBoard);
