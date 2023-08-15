class Chat extends HTMLElement {
  constructor() {
    super();
    window.chat = this;

    this.name = "?"
    this.history = [];
    this.activeUsers = [];

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        @media only screen and (max-width: 1000px){
          * {
            font-size: 12px; /* twice as big as the default size */
          }

        }
        #chat-container {
          position: fixed;
          bottom: 0.5em;
          right: 0.5em;
          border: 1px solid #ccc;
          background-color: #f9f9f9;
        }
        #chat-header {
          cursor: pointer;
          background-color: #ddd;
          padding: 10px;
          font-weight: bold;
        }
        #chat-body {
          max-height: 40vh;
          overflow: auto;
          display: none;
          padding: 10px;
        }
        #active-users {
          font-size: 0.8em;
        }
        #messages {
          margin-bottom: 10px;
        }
        #clear-button {
            style="float: right;"
        }
      </style>
      <div id="chat-container">
        <div id="chat-header">
        Chat
        <input id="chat-name" style="float:right">
        </div>

        <div id="chat-body">
          <div id="active-users"></div>
          <button id="clear-button">Clear</button>
          <div id="messages"></div>

          <input id="input-message" type="text" placeholder="Type a message...">
          <button id="send-button">Send</button>
          <button id="emoji-button" style="display: inline-block">👋</button>
        </div>
      </div>
    `;

    // Elements
    this.chatHeader = this.shadowRoot.getElementById('chat-header');
    this.chatBody = this.shadowRoot.getElementById('chat-body');
    this.chatName = this.shadowRoot.getElementById('chat-name');
    this.activeUsersEl = this.shadowRoot.getElementById('active-users');
    this.messagesEl = this.shadowRoot.getElementById('messages');
    this.emojiButton = this.shadowRoot.getElementById('emoji-button');
    this.inputMessage = this.shadowRoot.getElementById('input-message');
    this.sendButton = this.shadowRoot.getElementById('send-button');
    this.clearButton = this.shadowRoot.getElementById('clear-button');
    this.clearButton.addEventListener('click', () => {
        this.messagesEl.innerHTML = "";
    })

    this.pingTime = 0;

    this.emojiButton.addEventListener('click', this.ping.bind(this));

    this.chatName.value = localStorage.getItem("name") || "?";
    this.chatName.addEventListener('change', (() => {
        console.log("Name changed to " + this.chatName.value);
        localStorage.setItem("name", this.chatName.value);
        if (this.m){
            this.m.name = this.chatName.value;
            if (this.m.tabID && !this.m.name.endsWith(this.m.tabID)){
                this.m.name += "_" + this.m.tabID;
            }
            this.name = this.m.name;
            this.chatName.value = this.name;
        }else{
            this.name = this.chatName.value;
        }
    }).bind(this));


    this.sendMessage = this.sendMessage.bind(this);
    this.attachMQTT = this.attachMQTT.bind(this);
    this.attachMQTTRTC = this.attachMQTTRTC.bind(this);

    this.inputMessage.addEventListener('keydown', (e) => {
        if (e.key === "Enter" && !e.ctrlKey){
            this.sendMessage();
        }
        e.stopPropagation();
    })

    // Event listeners
    this.chatHeader.addEventListener('click', () => this.toggleChat());
    this.sendButton.addEventListener('click', () => this.sendMessage());

    // Load initial history
    this.history.forEach((entry) => this.appendMessage(entry));

    this.chatBody.style.display = "block";


  }
  attachMQTT(m){
    this.m = m;
    this.send = m.send.bind(m);
    if (m.data.chat){
        this.setHistory(m.data.chat);
    }
    m.onChat = this.receive.bind(this);
  }
  attachMQTTRTC(m){
    this.m = m;
    this.send = m.sendChat.bind(m);
    this.name = m.name;
    this.chatName.value = this.name;
    m.handlers.chat = (message, sender) => {this.receive.bind(this)({data: message, sender: sender, timestamp: Date.now()})};
    m.handlers.activeUsers = (activeUsers) => {this.onActiveUsersChange.bind(this)(activeUsers)};
//    m.handlers.RTCconnection = (message, sender) => {this.receive.bind(this)({data: `<${message}>`, sender: sender, timestamp: Date.now()})};
  }
  setHistory(history){
    this.history = history;
    this.history.forEach((entry) => this.appendMessage(entry));
  }

  send(message){
    console.warn("No MQTT connection");
  }
  ping(){
    this.sendMessage("👋");
    this.pingTime = Date.now();
  }
  receive({data, sender, timestamp}) {
    if (data === "👋"){
        let t = Date.now();
        if ((t - this.pingTime) > 2000){
            this.ping();
        }
    }
    this.history.push({ data, sender, timestamp });
    this.appendMessage({ data, sender, timestamp });
  }

  toggleChat() {
    this.chatBody.style.display = this.chatBody.style.display === 'none' ? 'block' : 'none';
  }

  sendMessage(data) {
    data = data || this.inputMessage.value;
    this.send(data);
    this.appendMessage({ data, sender: this.name + "( You )", timestamp: new Date() });
    this.inputMessage.value = '';
  }

  appendMessage({ data, sender, timestamp }) {
    const messageEl = document.createElement('div');
    messageEl.textContent = `${sender}: ${data}`;
    this.messagesEl.appendChild(messageEl);
  }

  onActiveUsersChange(activeUsers) {
    console.log("Active users: ", activeUsers);
    this.activeUsers = activeUsers;
    this.activeUsersEl.innerHTML = 'Active users: ' + activeUsers.join(', ');
  }
}

customElements.define('my-chat', Chat);


export { Chat };