import { tabID } from "./tabID.js";
import { DeferredPromise } from "./deferredPromise.js";


let baseTopic = (location.hostname + location.pathname + (location.hash || "")).replace(/[^a-zA-Z0-9]/g, ".");


export class MQTTRTCClient {
  constructor(config){
    let {topic, name, options, handlers} = config || {};
    this.handlers.connection = this.connection.bind(this);
    let n = localStorage.getItem("name");
    if (n && n.startsWith("anon")){
        n = null;
    }
    this.name = name || n || ("anon" + Math.floor(Math.random() * 1000));

    localStorage.setItem("name", this.name);
    this.name += "_" + tabID;
    this.tabID = tabID;

    this.topic = baseTopic + (topic || "");
    this.send = this.send.bind(this);

    for (let [k, v] of Object.entries(this.mqttHandlers)){
        this.mqttHandlers[k] = v.bind(this);
    }
    for (let [k, v] of Object.entries(this.handlers)){
        this.handlers[k] = v.bind(this);
    }

    this.rollCalls = {};
    this.activeUsers = [];
    this.activeRTCConnections = [];

    this.rtcConnections = {};
    this.rtcChannels = {};


    let client = mqtt.connect('wss://public:public@public.cloud.shiftr.io', {clientId: 'javascript'});
    client.on('connect', (function() {
        client.subscribe(this.topic);
        let t = Date.now();
        this.rollCalls[t] = []
        this.send(t, "rollCall")
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



    // WebRTC Configuration
    this.rpcConfiguration = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] };


    window.addEventListener("beforeunload", () => {
        this.sendRTC("left", "connection")
        this.send("Goodbye", "goodbye");

    })

    setTimeout((() => {
        if (!this.activeUsers){
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
        console.log("Roll call from " + payload.sender, payload);
        let t = payload.data;
        let newRollCall = !this.rollCalls[t];
        if (!this.rollCalls[t]){
            this.rollCalls[t] = [];
        }
        if (!this.activeUsers.includes(payload.sender)){
            this.activeUsers.push(payload.sender);
            if (this.handlers["activeUsers"]){
                this.handlers["activeUsers"](this.activeUsers);
            }
        }
        if (!this.rollCalls[t].includes(payload.sender)){
            this.rollCalls[t].push(payload.sender);
            if (this.rtcConnections[payload.sender]){
                if (this.rtcConnections[payload.sender].connectionState === "connected"){
                    console.warn("Already connected to " + payload.sender);
                }else{
                    console.warn("Already have a connection to " + payload.sender + " but it's not connected. Closing and reopening.");
//                    this.rtcConnections[payload.sender].close();
//                    delete this.rtcConnections[payload.sender];
//                    delete this.rtcChannels[payload.sender];
//                    this.offerRTCConnection(payload.sender);
                }
            }else if (newRollCall){

                this.offerRTCConnection(payload.sender);
            }

            this.send(t, "rollCall");
        }else{
            console.warn("Already received roll call from " + payload.sender);
        }
        if (!this.rollCalls[t]){
            this.rollCalls[t] = [];
        }

    },
    goodbye: payload => {
        this.activeUsers = this.activeUsers.filter((name) => name !== payload.sender);
        if (this.handlers["activeUsers"]){
            this.handlers["activeUsers"](this.activeUsers);
        }
        this.activeRTCConnections = this.activeRTCConnections.filter((name) => name !== payload.sender);
        if (this.rtcConnections[payload.sender]){
            this.rtcConnections[payload.sender].close();
            delete this.rtcConnections[payload.sender];
        }
        for (let channel of Object.values(this.rtcChannels)){
            delete this.rtcChannels[payload.sender];
        }
    },
    RTCoffer: payload => {
        console.log("received RTCoffer", payload);
        let {offer, target} = payload.data;
        if (target != this.name){return};
        if (this.rtcConnections[payload.sender]){
            this.rtcConnections[payload.sender].close();
            delete this.rtcConnections[payload.sender];
            delete this.rtcChannels[payload.sender];
        }
        let peerConnection = this.makeRTCConnection(payload.sender);
        this.rtcConnections[payload.sender] = peerConnection;

        console.log("Setting remote description");
        peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
          .then(() => peerConnection.createAnswer())
          .then(answer => peerConnection.setLocalDescription(answer))
          .then((answer) => {
            // Send answer via MQTT
            this.send({
                "answer": peerConnection.localDescription,
                "target": payload.sender,
            }, "RTCanswer");
          });
    },
    RTCanswer: payload => {
        console.log("received RTCanswer", payload);
        let {answer, target} = payload.data;
        if (target != this.name){return};
        let peerConnection = this.rtcConnections[payload.sender]; // Using the correct connection
        if (!peerConnection){
            console.error("No connection found for " + payload.sender);
            return
        }
        if (peerConnection.signalingState !== 'have-local-offer') {
            console.warn("Wrong state " + peerConnection.signalingState);
//            this.offerRTCConnection(payload.sender);
            return;
        }
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        setTimeout((()=>this.sendRTC("joined", "connection", payload.sender)).bind(this), 100);
    },
    RTCiceCandidate: payload => {
        let peerConnection = this.rtcConnections[payload.sender]; // Using the correct connection
        if (!peerConnection){
            console.error("No connection found for " + payload.sender);
            this.offerRTCConnection(payload.sender);
            peerConnection = this.makeRTCConnection(payload.sender);
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


    peerConnection.ondatachannel = (event) => {
        let dataChannel = event.channel;
        this.rtcChannels[name] = dataChannel;
        dataChannel.onmessage = ((event) => {
            let d = JSON.parse(event.data);
            this.handle(d, name);
        }).bind(this);
    }
    return peerConnection
  }
  offerRTCConnection(name){
    if (this.rtcConnections[name]) {
    console.warn(`Connection already exists with ${name}, not offering again.`);
    return;
    }
    this.rtcConnections[name] = this.makeRTCConnection(name);
    let peerConnection = this.rtcConnections[name];
    let dataChannel = peerConnection.createDataChannel("main");

    dataChannel.onmessage = ((event) => {
        let d = JSON.parse(event.data);
        this.handle(d, name);
    }).bind(this);

    dataChannel.onerror = error => {
      console.error("Data Channel Error:", error);
    };
    this.rtcChannels[name] = dataChannel;

    peerConnection.createOffer()
      .then(offer => peerConnection.setLocalDescription(offer))
      .then(() => {
        // Send offer via MQTT
        console.log("Sending offer to " + name);
        this.send({"offer": peerConnection.localDescription, "target": name}, "RTCoffer");
      });

//    setTimeout((()=>{
//        if (dataChannel.readyState != "open"){
//            console.warn("RTC connection to " + name + " timed out");
//            peerConnection.close();
//            delete this.rtcConnections[name];
//            setTimeout(()=>{this.offerRTCConnection(name)}, 1000);
//        }else{
//
//        }
//    }).bind(this), 3000)
  }
  
  connection(data, sender){
        console.log("connection", data, sender)
        if (this.handlers["RTCconnection"]){
            this.handlers["RTCconnection"](data, sender);
        }
        if (data === "joined"){
            if (!this.activeUsers.includes(sender)){
                console.log("Received connection from", sender);
                this.activeUsers.push(sender);
            }else{
                console.warn("Already received connection from " + sender);
            }
            if (!this.activeRTCConnections.includes(sender)){
                this.activeRTCConnections.push(sender);
                this.send("joined", "connection", sender);
            }
        }else if (data === "left"){
            console.log("Received disconnection from", sender);
            this.activeUsers = this.activeUsers.filter((name) => name !== sender);
        }
        if (this.handlers["activeUsers"]){
            this.handlers["activeUsers"](this.activeUsers);
        }
  }
  handle(data, sender){
    let t = data.type;
    let d = data.data;
    if (this.handlers[t]){
        this.handlers[t](d, sender);
    }
  }

  handlers = {
    dm: (data, sender) => {
        console.log("Received DM from", sender, data);
    },
    chat: (data, sender) => {
        console.log("Received group chat from", sender, data);
    }
  }
  getRTCConnections(users){
    users = users || this.activeUsers;
    if (typeof users === "string"){
        users = [users];
    }
    return Object.fromEntries(users.map((name) => [name, this.rtcConnections[name]]));
  }
  sendRTC(data, type, users){
    let connections = this.getRTCConnections(users);
    let payload = {"type": type, "data": data}
    let d = JSON.stringify(payload);
    for (let [user, connection] of Object.entries(connections)){
        let channel = this.rtcChannels[user];
        if (!channel){
            console.error("No channel found for " + user);
            return
        }
        if (channel.readyState !== "open"){
            console.log("Channel not open", channel.readyState);
            return
        }
        channel.send(d);
    }
  }
  sendDM(message, target){
    this.sendRTC(message, "dm", target);
  }
  sendChat(message){
    this.sendRTC(message, "chat");
  }
}

