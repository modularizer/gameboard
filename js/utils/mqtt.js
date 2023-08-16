import { IndexedDBBackend } from "./db.js";
import { tabID } from "./tabID.js";

let db = new IndexedDBBackend("mqttData", "mqttData");

let baseTopic = (location.hostname + location.pathname + (location.hash || "")).replace(/[^a-zA-Z0-9]/g, ".");



export class MQTTClient {
  constructor(topic, name, options){
    this.name = name || localStorage.getItem("name") || ("anonymous" + Math.floor(Math.random() * 1000));
    localStorage.setItem("name", this.name);
    this.name += "_" + tabID;

    this.topic = baseTopic + (topic || "");
    this.send = this.send.bind(this);

    for (let [k, v] of Object.entries(this.handlers)){
        this.handlers[k] = v.bind(this);
    }

    let client = mqtt.connect('wss://public:public@public.cloud.shiftr.io', {clientId: 'javascript'});
    client.on('connect', (function() {
        console.log('client has connected!');
        client.subscribe(this.topic);
        console.log("Subscribed to " + this.topic);
    }).bind(this));
    client.on('message', ((t, payloadString)=>{
        if (t === this.topic){
            let payload = JSON.parse(payloadString);
            if (payload.sender === this.name){
                return;
            }
            console.log("Received message: ", payload);
            let type = payload.type;
            if (this.handlers[type]){
                this.handlers[type](payload);
            }else{
                console.warn("Unhandled message type: " + type, payload);
            }
        }
    }).bind(this));
    this.client = client;

    this.rollCalls = {};
    this.activeUsers = [];
    this.data = {};
    this.send(Date.now(), "rollCall")

    window.addEventListener("beforeunload", () => {
        this.send("Goodbye", "goodbye");
    })

    setTimeout((() => {
        if (!this.activeUsers){
            // no one responded to the roll call
            db.getItem(baseTopic).then((data) => {
                this.data = data || {};
                if (!data){
                    db.setItem(baseTopic, this.data);
                }
            })
        }
    }).bind(this), 1000);
  }
  send(message, type = "chat"){
    let payload = {
        sender: this.name,
        timestamp: Date.now(),
        type: type,
        data: message
    }
    let payloadString = JSON.stringify(payload);
    this.client.publish(this.topic, payloadString);
  }
  handlers = {
    rollCall: payload => {
        let t = payload.data;
        if (!this.rollCalls[t]){
            this.rollCalls[t] = [];

            // give everyone a second to respond
            setTimeout((() => {
                this.activeUsers = this.rollCalls[t];
                console.log("Active users: " + this.activeUsers);
            }).bind(this), 1000);

            // ask the first person to send the startup data
            this.send(payload.sender, "startupDataRequest");
        }
        if (!this.rollCalls[t].includes(payload.sender)){
            this.rollCalls[t].push(payload.sender);
            console.log("sending roll call response", this.name);
            this.send(t, "rollCall");
        }
    },
    startupDataRequest: payload => {
        if (payload.data === this.name){
            this.send(this.data, "startupData");
        }
    },
    startupData: payload => {
        if (!this.data){
            this.data = payload.data;
            db.setItem(baseTopic, this.data);
        }
    },
    goodbye: payload => {
        this.activeUsers = this.activeUsers.filter((name) => name !== payload.sender);
    },
    chat: payload => {
        console.log("Received chat message: " + payload.data + " from " + payload.sender)
        if (!this.data.chat){
            this.data.chat = [];
        }
        this.data.chat.push(payload);
        db.setItem(baseTopic, this.data);
        this.onChat(payload);
    },
  }

  onChat(payload){
    // override this
  }
}
