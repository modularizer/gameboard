window.version = 'v20240520T05:03:22.558Z';

import { GameBoard } from "./gameboard.js?v20240520T05:03:22.558Z";
import { ScoreCard } from "./utils/score-card.js?v20240520T05:03:22.558Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
