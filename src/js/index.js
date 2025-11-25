window.version = 'v20251125T20:57:13.850Z';

import { GameBoard } from "./gameboard.js?v20251125T20:57:13.850Z";
import { ScoreCard } from "./utils/score-card.js?v20251125T20:57:13.850Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
