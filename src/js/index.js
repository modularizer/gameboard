window.version = 'v20240525T19:48:39.470Z';

import { GameBoard } from "./gameboard.js?v20240525T19:48:39.470Z";
import { ScoreCard } from "./utils/score-card.js?v20240525T19:48:39.470Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
