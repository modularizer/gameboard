window.version = 'v20230905T00:13:44.114Z';

import { GameBoard } from "./gameboard.js?v20230905T00:13:44.114Z";
import { ChatBox } from "./utils/chat.js?v20230905T00:13:44.114Z";
import { ScoreCard } from "./utils/score-card.js?v20230905T00:13:44.114Z";

customElements.define('score-card', ScoreCard);
customElements.define('chat-box', ChatBox);
customElements.define('game-board', GameBoard);
