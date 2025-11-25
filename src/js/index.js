window.version = 'v20251125T20:25:42.514Z';

import { GameBoard } from "./gameboard.js?v20251125T20:25:42.514Z";
import { ScoreCard } from "./utils/score-card.js?v20251125T20:25:42.514Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
