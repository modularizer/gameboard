import { tabID } from "./tabID.js";
import { DeferredPromise } from "./deferredPromise.js";


let baseTopic = (location.hostname + (location.hash || "")).replace(/[^a-zA-Z0-9]/g, ".");


export class MQTTRTCClient {
  constructor(config){
    let {topic, name, options, handlers} = config || {};
    this.handlers = Object.assign(this.handlers, handlers);

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


    let client = mqtt.connect('wss://public:public@public.cloud.shiftr.io', {clientId: 'javascript'});
    client.on('connect', (function() {
        client.subscribe(this.topic);
        let t = Date.now();
        this.rollCalls[t] = []
        this.post(t, "rollCall")
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

    window.addEventListener("beforeunload", () => {
        this.send("left", "connection")
        this.post("Goodbye", "goodbye");

    })

  }

  post(message, type = "chat"){
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
        console.log("Roll call from " + payload.sender, payload, payload.data);
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
            if (this.rtcConnections[payload.sender] && this.rtcConnections[payload.sender].connectionState === "connected"){
                console.warn("Already connected to " + payload.sender);
            }else{
                if (this.rtcConnections[payload.sender]){
                    console.warn("Already have a connection to " + payload.sender + " but it's not connected. Closing and reopening.");
                    this.rtcConnections[payload.sender].close();
                }

                if (newRollCall){
                    this.rtcConnections[payload.sender] = new RTCConnection(this.name, payload.sender, this, this.handlers);
                    this.rtcConnections[payload.sender].sendOffer();
                }
            }
            this.post(t, "rollCall");
        }else{
            console.warn("Already received roll call from " + payload.sender, t);
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
    },
    RTCoffer: payload => {
        console.log("received RTCoffer", payload);
        let {offer, target} = payload.data;
        if (target != this.name){return};
        if (this.rtcConnections[payload.sender]){
            this.rtcConnections[payload.sender].close();
        }
        this.rtcConnections[payload.sender] = new RTCConnection(this.name, payload.sender, this, this.handlers);
        this.rtcConnections[payload.sender].respondToOffer(offer);
    },
    RTCanswer: payload => {
        console.log("received RTCanswer", payload);
        let {answer, target} = payload.data;
        if (target != this.name){return};
        let rtcConnection = this.rtcConnections[payload.sender]; // Using the correct connection
        if (!rtcConnection){
            console.error("No connection found for " + payload.sender);
            return
        }
        rtcConnection.receiveAnswer(answer);
    },
    RTCiceCandidate: payload => {
        let rtcConnection = this.rtcConnections[payload.sender]; // Using the correct connection
        if (!rtcConnection){
            console.error("No connection found for " + payload.sender);
            this.rtcConnections[payload.sender] = new RTCConnection(this.name, payload.sender, this, this.handlers);
            let rtcConnection = this.rtcConnections[payload.sender];
            rtcConnection.sendOffer();
        }
        rtcConnection.onReceivedIceCandidate(payload.data);
    }
  }

  handlers = {
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
                this.post("joined", "connection", sender);
            }
        }else if (data === "left"){
            console.log("Received disconnection from", sender);
            this.activeUsers = this.activeUsers.filter((name) => name !== sender);
        }
        if (this.handlers["activeUsers"]){
            this.handlers["activeUsers"](this.activeUsers);
        }
    },
  }
  getRTCConnections(users){
    users = users || this.activeUsers;
    if (typeof users === "string"){
        users = [users];
    }
    return users.map((name) => this.rtcConnections[name]).filter((connection) => connection);
  }
  send(data, type, users){
    let connections = this.getRTCConnections(users);
    for (let connection of connections){
        connection.send(data, type);
    }
  }
  sendDM(message, target){
    this.send(message, "dm", target);
  }
  sendChat(message){
    this.send(message, "chat");
  }
}



export class RTCConnection {
    rtcConfiguration = { "iceServers": [{ "urls": "stun:stun.l.google.com:19302" }] }


    constructor(name, target, mqttClient, handlers){
        console.log("making RTCConnection", handlers)
        this.name = name;
        this.target = target;
        this.mqttClient = mqttClient;
        this.handlers = handlers
        this.dataChannels = {};
        this.peerConnection = new RTCPeerConnection(this.rtcConfiguration);
        this.peerConnection = new RTCPeerConnection(this.rtcConfiguration);

        this.peerConnection.onicecandidate = this.onicecandidate.bind(this);

        this.dataChannelDeferredPromises = Object.fromEntries(Object.entries(this.handlers).map(([name, handler]) => [name, new DeferredPromise()]));
        this.loadPromise = Promise.all(Object.values(this.dataChannelDeferredPromises).map((deferredPromise) => deferredPromise.promise));
        this.loaded = false;
        this.loadPromise.then((() => {this.loaded = true}).bind(this));



        this.peerConnection.ondatachannel = ((event) => {
            this.registerDataChannel(event.channel);
        }).bind(this);
    }

    sendOffer(){
        this.setupDataChannels();
        this.peerConnection.createOffer()
          .then(offer => this.peerConnection.setLocalDescription(offer))
          .then(() => {
            // Send offer via MQTT
            console.log("Sending offer to " + this.target);
            this.mqttClient.post({"offer": this.peerConnection.localDescription, "target": this.target}, "RTCoffer");
          });
    }
    registerDataChannel(dataChannel){
        dataChannel.onmessage = ((e) => {
            this.onmessage(e, dataChannel.label);
        }).bind(this);
        dataChannel.onerror = ((e) => {
            this.dataChannelDeferredPromises[dataChannel.label].reject(e);
            this.ondatachannelerror(e, dataChannel.label);
        }).bind(this);
        dataChannel.onopen = ((e) => {
            this.dataChannelDeferredPromises[dataChannel.label].resolve(e);
        }).bind(this);
        this.dataChannels[dataChannel.label] = dataChannel;
    }
    setupDataChannels(){
        for (let [name, dataChannelHandler] of Object.entries(this.handlers)){
            let dataChannel = this.peerConnection.createDataChannel(name);
            this.registerDataChannel(dataChannel);
        }
    }

    respondToOffer(offer){

        this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
              .then(() => this.peerConnection.createAnswer())
              .then(answer => this.peerConnection.setLocalDescription(answer))
              .then((answer) => {
                // Send answer via MQTT
                this.mqttClient.post({
                    "answer": this.peerConnection.localDescription,
                    "target": this.target,
                }, "RTCanswer");
              });
    }

    receiveAnswer(answer){
        if (this.peerConnection.signalingState !== 'have-local-offer') {
            console.warn("Wrong state " + this.peerConnection.signalingState);
            return;
        }
        this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        this.loadPromise.then((() => this.send("joined", "connection")).bind(this));
    }

    dm(data){
        this.send(data, "dm");
    }
    send(data, type){
        try{
        let d = this.handlers[type].raw?data:JSON.stringify(data);
        this.sendRaw(d, type);
        }catch(e){
        console.error("error sending", type, this.handlers)
        }
    }
    sendRaw(d, type){
        let dataChannel = this.dataChannels[type];
        if (!dataChannel){
            if (this.handlers[type]){
                console.warn("handler found for type", type, "but no data channel");
            }
            console.warn("No data channel for type", type);
            return
        }
        if (dataChannel.readyState !== "open"){
            console.log("Channel not open", dataChannel.readyState);
            return
        }
        dataChannel.send(d);
    }
    onmessage(event, type){
        let sender = this.target;
        let handler = this.handlers[type];
        let data = handler.raw?event.data:JSON.parse(event.data);
        if (handler){
            handler(data, sender);
        }else{
            console.warn("No handler for type", type);
        }
    }

    onReceivedIceCandidate(data) {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
    }

    onicecandidate(event){
        if (event.candidate) {
            // Send ICE candidate via MQTT
            this.mqttClient.post(event.candidate, "RTCiceCandidate");
        }
    }
    ondatachannel(event){
        let dataChannel = event.channel;
        this.dataChannels[event.name] = dataChannel;
        dataChannel.onmessage = this.onmessage.bind(this);
    }
    ondatachannelerror(error, channelName){
//        console.error("Data Channel Error:", event, "on channel", channelName);
    }

    close(){
        this.peerConnection.close();
        this.closed = true;
        this.peerConnection = null;
    }

}