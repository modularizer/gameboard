window.version = 'v20230904T22:42:52.629Z';

import { GameBoard } from "./gameboard.js?v20230904T22:42:52.629Z";
import { ChatBox } from "./utils/chat.js?v20230904T22:42:52.629Z";
import { ScoreCard } from "./utils/score-card.js?v20230904T22:42:52.629Z";

customElements.define('score-card', ScoreCard);
customElements.define('chat-box', ChatBox);
customElements.define('game-board', GameBoard);
