import { tabID } from "./tabID.js";
import { DeferredPromise } from "./deferredPromise.js";


let baseTopic = (location.hostname + location.pathname + (location.hash || "")).replace(/[^a-zA-Z0-9]/g, ".");


export class MQTTRTCClient {
  constructor(config){
    let {topic, name, options, handlers} = config || {};
    this.handlers.connection = this.connection.bind(this);

    this.name = name || localStorage.getItem("name") || ("anon" + Math.floor(Math.random() * 1000));
    localStorage.setItem("name", this.name);
    this.name += "_" + tabID;

    this.topic = baseTopic + (topic || "");
    this.send = this.send.bind(this);

    for (let [k, v] of Object.entries(this.mqttHandlers)){
        this.mqttHandlers[k] = v.bind(this);
    }
    for (let [k, v] of Object.entries(this.handlers)){
        this.handlers[k] = v.bind(this);
    }

    let client = mqtt.connect('wss://public:public@public.cloud.shiftr.io', {clientId: 'javascript'});
    client.on('connect', (function() {
        client.subscribe(this.topic);
        this.send(Date.now(), "rollCall")
    }).bind(this));
    client.on('message', ((t, payloadString)=>{
        if (t === this.topic){
            let payload = JSON.parse(payloadString);
            if (payload.sender === this.name){
                return;
            }
            let type = payload.type;
            if (this.mqttHandlers[type]){
                this.mqttHandlers[type](payload);
            }else if (this.handlers[type]){
                this.handlers[type](payload.data, payload.sender);
            }else{
                console.warn("Unhandled message type: " + type, payload);
            }
        }
    }).bind(this));
    this.client = client;

    this.rollCalls = {};
    this.activeMQTTUsers = [];
    this.activeRTCUsers = [];

    this.rtcConnections = {};
    this.rtcChannels = {};

    // WebRTC Configuration
    this.rpcConfiguration = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] };


    window.addEventListener("beforeunload", () => {
        this.send("Goodbye", "goodbye");
        this.sendRTC("left", "connection")
    })

    setTimeout((() => {
        if (!this.activeMQTTUsers){
            // no one responded to the roll call
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
  mqttHandlers = {
    rollCall: payload => {
        let t = payload.data;
        if (!this.rollCalls[t]){
            this.rollCalls[t] = [];
        }
        if (!this.rollCalls[t].includes(payload.sender)){
            this.rollCalls[t].push(payload.sender);
            if (this.rtcConnections[payload.sender]){
                if (this.rtcConnections[payload.sender].connectionState === "connected"){
                    console.warn("Already connected to " + payload.sender);
                }else{
                    console.warn("Already have a connection to " + payload.sender + " but it's not connected. Closing and reopening.");
                    this.rtcConnections[payload.sender].close();
                    delete this.rtcConnections[payload.sender];
                    this.offerRTCConnection(payload.sender);
                }
            }else{
                this.offerRTCConnection(payload.sender);
            }
            this.send(t, "rollCall");
        }else{
            console.warn("Already received roll call from " + payload.sender);
        }
        if (!this.rollCalls[t]){
            this.rollCalls[t] = [];

            // give everyone a second to respond
            setTimeout((() => {
                this.activeMQTTUsers = this.rollCalls[t];
                if (this.handlers["activeMQTTUsers"]){
                    this.handlers["activeMQTTUsers"](this.activeMQTTUsers);
                }
            }).bind(this), 1000);
        }

    },
    goodbye: payload => {
        this.activeMQTTUsers = this.activeMQTTUsers.filter((name) => name !== payload.sender);
        if (this.handlers["activeMQTTUsers"]){
            this.handlers["activeMQTTUsers"](this.activeMQTTUsers);
        }
        this.activeRTCUsers = this.activeRTCUsers.filter((name) => name !== payload.sender);
        if (this.handlers["activeRTCUsers"]){
            this.handlers["activeRTCUsers"](this.activeRTCUsers);
        }
        if (this.rtcConnections[payload.sender]){
            this.rtcConnections[payload.sender].close();
            delete this.rtcConnections[payload.sender];
        }
        for (let channel of Object.values(this.rtcChannels)){
            delete this.rtcChannels[payload.sender];
        }
    },
    RTCoffer: payload => {
        let {offer, target} = payload.data;
        if (target != this.name){return};
        let peerConnection = this.rtcConnections[payload.sender];
        if (!peerConnection){
            peerConnection = this.makeRTCConnection();
            this.rtcConnections[payload.sender] = peerConnection;
        }
        peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => peerConnection.createAnswer())
          .then(answer => peerConnection.setLocalDescription(answer))
          .then((answer) => {
            // Send answer via MQTT
            this.send({"answer": peerConnection.localDescription, "target": payload.sender}, "RTCanswer");
          });
    },
    RTCanswer: payload => {
        let {answer, target} = payload.data;
        if (target != this.name){return};
        let peerConnection = this.rtcConnections[payload.sender]; // Using the correct connection
        if (!peerConnection || peerConnection.signalingState !== 'have-local-offer') {
            console.warn("No connection found or wrong state for " + payload.sender);
            return;
        }
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        this.rtcChannels["connection"][payload.sender].addEventListener('open', () => {
            this.sendRTC("joined", "connection", payload.sender);
        })

    },
    RTCiceCandidate: payload => {
        let peerConnection = this.rtcConnections[payload.sender]; // Using the correct connection
        if (!peerConnection){
            peerConnection = this.makeRTCConnection();
            this.rtcConnections[payload.sender] = peerConnection;
        }
        peerConnection.addIceCandidate(new RTCIceCandidate(payload.data));
    }
  }
  makeRTCConnection(name){
    let peerConnection = new RTCPeerConnection(this.rtcConfiguration);

    peerConnection.onicecandidate = event => {
      if (event.candidate) {
        // Send ICE candidate via MQTT
        this.send(event.candidate, "RTCiceCandidate");
      }
    };
    return peerConnection
  }
  offerRTCConnection(name){
      if (this.rtcConnections[name]) {
        console.warn(`Connection already exists with ${name}, not offering again.`);
        return;
      }
    this.rtcConnections[name] = this.makeRTCConnection();
    let peerConnection = this.rtcConnections[name];

    for (let [channel, handler] of Object.entries(this.handlers)){
        let dataChannel = peerConnection.createDataChannel(channel);
        if (!this.rtcChannels[channel]){
            this.rtcChannels[channel] = {};
        }
        this.rtcChannels[channel][name] = dataChannel;
        dataChannel.onmessage = (event) => {
            handler(event.data, name);
        }
    }

    peerConnection.ondatachannel = (event) => {
        let dataChannel = event.channel;
        let channel = dataChannel.label;
        if (!this.rtcChannels[channel]){
            this.rtcChannels[channel] = {};
        }
        this.rtcChannels[channel][name] = dataChannel;
        dataChannel.onmessage = (event) => {
            this.handlers[channel](event.data, name);
        }
    }

    peerConnection.createOffer()
      .then(offer => peerConnection.setLocalDescription(offer))
      .then(() => {
        // Send offer via MQTT
        this.send({"offer": peerConnection.localDescription, "target": name}, "RTCoffer");
      });
  }
  
  connection(data, sender){
        if (this.handlers["RTCconnection"]){
            this.handlers["RTCconnection"](data, sender);
        }
        if (data === "joined"){
            if (!this.activeRTCUsers.includes(sender)){
                console.log("Received connection from", sender);
                this.send("joined", "connection", sender);
                this.activeRTCUsers.push(sender);
            }else{
                console.warn("Already received connection from " + sender);
            }
        }else if (data === "left"){
            console.log("Received disconnection from", sender);
            this.activeRTCUsers = this.activeRTCUsers.filter((name) => name !== sender);
        }
        if (this.handlers["activeRTCUsers"]){
            this.handlers["activeRTCUsers"](this.activeRTCUsers);
        }
  }

  handlers = {
    dm: (data, sender) => {
        console.log("Received DM from", sender, data);
    },
    chat: (data, sender) => {
        console.log("Received group chat from", sender, data);
    },
  }
  getRTCConnections(users){
    users = users || this.activeMQTTUsers;
    if (typeof users === "string"){
        users = [users];
    }
    return Object.fromEntries(users.map((name) => [name, this.rtcConnections[name]]));
  }
  sendRTC(data, name, users){
    let connections = this.getRTCConnections(users);
    let d = JSON.stringify(data);
    for (let [user, connection] of Object.entries(connections)){
        let channel = this.rtcChannels[name][user];
        channel.send(d);
    }
  }
  sendDM(message, target){
    this.send(message, "dm", target);
  }
  sendChat(message){
    this.send(message, "chat");
  }
}

