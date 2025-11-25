window.version = 'v20251125T18:17:04.013Z';

import { GameBoard } from "./gameboard.js?v20251125T18:17:04.013Z";
import { ScoreCard } from "./utils/score-card.js?v20251125T18:17:04.013Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
