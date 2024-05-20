window.version = 'v20240520T04:13:25.013Z';

import { GameBoard } from "./gameboard.js?v20240520T04:13:25.013Z";
import { ScoreCard } from "./utils/score-card.js?v20240520T04:13:25.013Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
