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
        #voice-button {
            float: right;
        }
        #speaker-button {
            float: right;
        }
        #clear-button {
            float: right;
        }
      </style>
      <div id="chat-container">
        <div id="chat-header">
        Chat
        <input id="chat-name" style="float:right">
        </div>

        <div id="chat-body">
          <div id="active-users"></div>

          <button id="voice-button">🎙️</button>
          <button id="speaker-button">🔊</button>
          <button id="clear-button">🗑️</button>
          <br/>
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
    this.voiceButton = this.shadowRoot.getElementById('voice-button');
    this.clearButton = this.shadowRoot.getElementById('clear-button');
    this.speakerButton = this.shadowRoot.getElementById('speaker-button');
    this.clearButton.addEventListener('click', () => {
        this.messagesEl.innerHTML = "";
    })

    this.streaming = false;
    this.voiceButton.addEventListener('click', (() => {
        if (!this.streaming){
            console.log("Starting streaming");
            this.voiceButton.style.backgroundColor = "red";

            this.streaming = true;
            this.rtc.startStreaming();
        }else{
            console.log("Stopping streaming");
            this.voiceButton.style.backgroundColor = "";
            this.streaming = false;
            this.rtc.stopStreaming();
        }
    }).bind(this))

    this.muted = true;
    this.speakerButton.addEventListener('click', (() => {
        if (!this.muted){
            this.muted = true;
            this.rtc.mute()
            this.speakerButton.style.backgroundColor = "";
        }else{
            this.muted = false;
            this.rtc.unmute()
            this.speakerButton.style.backgroundColor = "red";
        }
    }).bind(this))



    this.pingTime = 0;

    this.emojiButton.addEventListener('click', this.ping.bind(this));

    this.chatName.value = localStorage.getItem("name") || "?";
    this.chatName.addEventListener('change', (() => {
        console.log("Name changed to " + this.chatName.value);
        localStorage.setItem("name", this.chatName.value);
        if (this.rtc){
            this.rtc.name = this.chatName.value;
            if (this.rtc.tabID && !this.rtc.name.endsWith(this.rtc.tabID)){
                this.rtc.name += "_" + this.rtc.tabID;
            }
            this.name = this.rtc.name;
            this.chatName.value = this.name;
        }else{
            this.name = this.chatName.value;
        }
    }).bind(this));


    this.sendMessage = this.sendMessage.bind(this);
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
  attachMQTTRTC(rtc){
    this.rtc = rtc;
    this.send = rtc.sendChat.bind(rtc);
    this.name = rtc.name;
    this.chatName.value = this.name;
    rtc.handlers.chat = (message, sender) => {this.receive.bind(this)({data: message, sender: sender, timestamp: Date.now()})};
    rtc.handlers.activeUsers = (activeUsers) => {this.onActiveUsersChange.bind(this)(activeUsers)};
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