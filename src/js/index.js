window.version = 'v20230827T18:02:10.732Z';

import { GameBoard } from "./gameboard.js?v20230827T18:02:10.732Z";
import { ChatBox } from "./utils/chat.js?v20230827T18:02:10.732Z";

customElements.define('chat-box', ChatBox);
customElements.define('game-board', GameBoard);
