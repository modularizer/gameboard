window.version = 'v20230820T21:03:31.052Z';

import { GameBoard } from "./gameboard.js?v20230820T21:03:31.052Z";
import { ChatBox } from "./utils/chat.js?v20230820T21:03:31.052Z";

customElements.define('chat-box', ChatBox);
customElements.define('game-board', GameBoard);
