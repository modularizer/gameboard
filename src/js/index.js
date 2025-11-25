window.version = 'v20251125T18:50:47.964Z';

import { GameBoard } from "./gameboard.js?v20251125T18:50:47.964Z";
import { ScoreCard } from "./utils/score-card.js?v20251125T18:50:47.964Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
