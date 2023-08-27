window.version = 'v20230827T20:11:57.964Z';

import { GameBoard } from "./gameboard.js?v20230827T20:11:57.964Z";
import { ChatBox } from "./utils/chat.js?v20230827T20:11:57.964Z";
import { ScoreCard } from "./utils/score-card.js?v20230827T20:11:57.964Z";

customElements.define('score-card', ScoreCard);
customElements.define('chat-box', ChatBox);
customElements.define('game-board', GameBoard);
