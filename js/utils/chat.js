class Chat extends HTMLElement {
  constructor() {
    super();
    window.chat = this;


    this.history = [];
    this.activeUsers = [];

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        #chat-container {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 300px;
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
          max-height: 200px;
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
      </style>
      <div id="chat-container">
        <div id="chat-header">Chat</div>
        <div id="chat-body">
          <div id="active-users"></div>
          <div id="messages"></div>
          <input id="input-message" type="text" placeholder="Type a message...">
          <button id="send-button">Send</button>
        </div>
      </div>
    `;

    // Elements
    this.chatHeader = this.shadowRoot.getElementById('chat-header');
    this.chatBody = this.shadowRoot.getElementById('chat-body');
    this.activeUsersEl = this.shadowRoot.getElementById('active-users');
    this.messagesEl = this.shadowRoot.getElementById('messages');
    this.inputMessage = this.shadowRoot.getElementById('input-message');
    this.sendButton = this.shadowRoot.getElementById('send-button');


    this.sendMessage = this.sendMessage.bind(this);
    this.attachMQTT = this.attachMQTT.bind(this);

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


  }
  attachMQTT(m){
    this.m = m;
    this.send = m.send.bind(m);
    if (m.data.chat){
        this.setHistory(m.data.chat);
    }
    m.onChat = this.receive.bind(this);
  }
  setHistory(history){
    this.history = history;
    this.history.forEach((entry) => this.appendMessage(entry));
  }

  send(message){
    console.warn("No MQTT connection");
  }

  toggleChat() {
    this.chatBody.style.display = this.chatBody.style.display === 'none' ? 'block' : 'none';
  }

  sendMessage() {
    const data = this.inputMessage.value;
    this.send(data);
    this.appendMessage({ data, sender: 'You', timestamp: new Date() });
    this.inputMessage.value = '';
  }

  appendMessage({ data, sender, timestamp }) {
    const messageEl = document.createElement('div');
    messageEl.textContent = `${sender}: ${data}`;
    this.messagesEl.appendChild(messageEl);
  }

  receive({data, sender, timestamp}) {
    this.history.push({ data, sender, timestamp });
    this.appendMessage({ data, sender, timestamp });
  }

  onActiveUsersChange(activeUsers) {
    this.activeUsers = activeUsers;
    this.activeUsersEl.innerHTML = 'Active users: ' + activeUsers.join(', ');
  }
}

customElements.define('my-chat', Chat);


export { Chat };