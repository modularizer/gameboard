window.version = 'v20240526T17:29:58.174Z';

import { GameBoard } from "./gameboard.js?v20240526T17:29:58.174Z";
import { ScoreCard } from "./utils/score-card.js?v20240526T17:29:58.174Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
