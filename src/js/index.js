window.version = 'v20240525T19:32:31.579Z';

import { GameBoard } from "./gameboard.js?v20240525T19:32:31.579Z";
import { ScoreCard } from "./utils/score-card.js?v20240525T19:32:31.579Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
