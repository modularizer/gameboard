window.version = 'v20240520T05:49:42.867Z';

import { GameBoard } from "./gameboard.js?v20240520T05:49:42.867Z";
import { ScoreCard } from "./utils/score-card.js?v20240520T05:49:42.867Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
