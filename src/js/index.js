window.version = 'v20230905T04:00:44.105Z';

import { GameBoard } from "./gameboard.js?v20230905T04:00:44.105Z";
import { ChatBox } from "./utils/chat.js?v20230905T04:00:44.105Z";
import { ScoreCard } from "./utils/score-card.js?v20230905T04:00:44.105Z";

customElements.define('score-card', ScoreCard);
customElements.define('chat-box', ChatBox);
customElements.define('game-board', GameBoard);
