window.version = 'v20251125T19:40:05.677Z';

import { GameBoard } from "./gameboard.js?v20251125T19:40:05.677Z";
import { ScoreCard } from "./utils/score-card.js?v20251125T19:40:05.677Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
