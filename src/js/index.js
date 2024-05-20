window.version = 'v20240520T04:29:43.242Z';

import { GameBoard } from "./gameboard.js?v20240520T04:29:43.242Z";
import { ScoreCard } from "./utils/score-card.js?v20240520T04:29:43.242Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
