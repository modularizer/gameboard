window.version = 'v20251129T18:13:30.329Z';

import { GameBoard } from "./gameboard.js?v20251129T18:13:30.329Z";
import { ScoreCard } from "./utils/score-card.js?v20251129T18:13:30.329Z";

customElements.define('score-card', ScoreCard);
customElements.define('game-board', GameBoard);
