window.version = 'v20240520T05:05:06.444Z';

import { GameBoard } from "./gameboard.js?v20240520T05:05:06.444Z";
import { ScoreCard } from "./utils/score-card.js?v20240520T05:05:06.444Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
