import * as THREE from 'three';
import { MQTTRTCClient } from './utils/mqtt-rtc.js';
import { WebRTCAudioChannel } from './utils/rtcAudio.js';
import { KeyListeners } from './utils/keyListeners.js';
import { CustomScene } from './scene.js';
import { loadJSON } from './components/model.js';

export class GameBoard extends HTMLElement {
    constructor() {
        super();
        // Create shadow root
        this.attachShadow({ mode: 'open' });

        // Include CSS
        const styleLink = document.createElement('link');
        styleLink.setAttribute('rel', 'stylesheet');
        styleLink.setAttribute('href', './src/css/style.css');
        this.shadowRoot.appendChild(styleLink);

        // Include HTML
        const wrapper = document.createElement('div');
        wrapper.innerHTML = `
          <div id="sceneBox" class="sceneBox"></div>
          <div id="select" class="widget tl">
            <select id="gameSelect">
                <option value="lobby">Please select a game</option>
            </select><br/>
            <select id="roomSelect">
                <option value="lobby">Please select a room</option>
            </select><br/>
            <input id="roomInput" placeholder="Room Name" class="hidden"></input>
          </div>
          <div id="instructionsBox" class="widget tr">
                <button id="q">?</button>
                <button id = "x" class="fr hidden">x</button>
                <pre id="instructions" class="hidden">
                </pre>
          </div>
          <pre id="subtitles" class="widget bc subtitles"></pre>
          <div id="disappearingLog" class="floating bl">

          </div>
          <button id="hideLogs" class="widget logs" style="opacity: 0;">x</button>
          <button id="showLogs" class="widget logs hidden">+</button>
          <chat-box id="chat" class="widget"></chat-box>

        `;
        wrapper.classList.add("fullscreen");
        this.shadowRoot.appendChild(wrapper);

        this.gameNames = ["lobby", "quoridor", "chess", "card", "cube"]
        this.roomNames = ["lobby", "octopus", "snail", "tree", "tortoise", "anchovie", "punctuation", "kettle", "circular", "squirrel", "caterpillar", "cucumber", "lightbulb", "snorkel", "giraffe", "chocolate"];
        this.secretRooms = JSON.parse(localStorage.getItem("secretRooms") || "[]");
        this.roomNames = this.roomNames.concat(this.secretRooms);
        this.roomNames.push("+");

        // bind handlers
        for (let o of [this.handlers, this.keydownHandlers, this.keyupHandlers]){
            for (let [k, v] of Object.entries(o)){
                o[k] = v.bind(this);
            }
        }
        this.onDocumentLoad = this.onDocumentLoad.bind(this);
        this.saveElements = this.saveElements.bind(this);
        this.bindElements = this.bindElements.bind(this);
        this.loadGame = this.loadGame.bind(this);
        this.showInstructions = this.showInstructions.bind(this);
        this.hideInstructions = this.hideInstructions.bind(this);

        this.rtc = new MQTTRTCClient({handlers: this.handlers});
        this.voiceChat = new WebRTCAudioChannel(this.rtc);
        this.keyListeners = new KeyListeners(this.keydownHandlers, this.keyupHandlers);
        this.keyListeners.addTo(window);
        this.scene = new CustomScene();
        this.scene.onlog = this.log.bind(this);
        this.scene.attachMQTTRTC(this.rtc);
        console.log("Gameboard constructed");
        this.onDocumentLoad();

    }
    onDocumentLoad() {
        console.log("document loaded");
        window.g = this;
        this.saveElements();
        this.bindElements();
        this.loadGame();
    }
    saveElements(){
        this.instructions = this.shadowRoot.getElementById("instructions");
        this.q = this.shadowRoot.getElementById("q");
        this.x = this.shadowRoot.getElementById("x");
        this.gameSelect = this.shadowRoot.getElementById("gameSelect");
        this.roomSelect = this.shadowRoot.getElementById("roomSelect");
        this.roomInput = this.shadowRoot.getElementById("roomInput");
        this.chat = this.shadowRoot.getElementById("chat");
        this.subtitles = this.shadowRoot.getElementById("subtitles");
        this.disappearingLog = this.shadowRoot.getElementById("disappearingLog");
        this.sceneBox = this.shadowRoot.getElementById("sceneBox");
        this.hideLogs = this.shadowRoot.getElementById("hideLogs");
        this.showLogs = this.shadowRoot.getElementById("showLogs");
        console.log("Saved elements");
    }
    bindElements(){
        this.q.addEventListener("click", (() => {
            this.showInstructions();
        }).bind(this));
        this.x.addEventListener("click", (() => {
            this.hideInstructions();
        }).bind(this));
        for (let game of this.gameNames){
            if (game === "lobby") continue;
            let option = document.createElement("option");
            option.value = game;
            option.innerHTML = game;
            this.gameSelect.appendChild(option);
        }
        for (let room of this.roomNames){
            if (room === "lobby") continue;
            let option = document.createElement("option");
            option.value = room;
            option.innerHTML = room;
            this.roomSelect.appendChild(option);
        }
        this.gameSelect.addEventListener("change", (e => {
            this.gameName = e.target.value;
            location.hash = "#" + this.gameName + "." + this.roomName;
            location.reload();
        }).bind(this));
        this.roomSelect.addEventListener("change", (e => {
            if (e.target.value === "+"){
                this.roomInput.classList.remove("hidden");
                this.roomInput.focus();
                return;
            }else{
                this.roomName = e.target.value;
                this.secretRooms.push(this.roomName);
                localStorage.setItem("secretRooms", JSON.stringify(this.secretRooms));
                location.hash = "#" + this.gameName + "." + this.roomName;
                location.reload();
            }
        }).bind(this));
        this.roomInput.addEventListener("change", (e => {
            this.roomName = e.target.value;
            location.hash = "#" + this.gameName + "." + this.roomName;
            location.reload();
        }).bind(this));
        this.hideLogs.addEventListener("click", (() => {
            localStorage.setItem("hideLogs", "true");
            this.disappearingLog.classList.add("hidden");
            this.hideLogs.classList.add("hidden");
            this.showLogs.classList.remove("hidden");
        }));
        this.showLogs.addEventListener("click", (() => {
            localStorage.removeItem("hideLogs");
            this.disappearingLog.classList.remove("hidden");
            this.hideLogs.classList.remove("hidden");
            this.showLogs.classList.add("hidden");
        }));
        this.scene.display(this.sceneBox);

        let h = localStorage.getItem("hideLogs");
        if (h === "true"){
            this.disappearingLog.classList.add("hidden");
            this.hideLogs.classList.add("hidden");
            this.showLogs.classList.remove("hidden");
        }else{
            this.disappearingLog.classList.remove("hidden");
            this.hideLogs.classList.remove("hidden");
            this.showLogs.classList.add("hidden");
        }

        this.instructions.innerHTML = this.defaultInstructions;
        console.log(this.chat)
        this.chat.attachMQTTRTC(this.rtc);
        console.log("Bound elements");
    }
    loadGame(){
        const hashParts = location.hash.replace("#", "").split(".");

        this.gameName = (hashParts && this.gameNames.includes(hashParts[0]))? hashParts[0] : (localStorage.getItem("game") || "lobby");
        this.roomName = (hashParts.length >= 2) ? hashParts[1] : (localStorage.getItem("room") || "lobby");
        if (!this.roomNames.includes(this.roomName)){
            this.roomNames.push(this.roomName);
            this.secretRooms.push(this.roomName);
            localStorage.setItem("secretRooms", JSON.stringify(this.secretRooms));
            let option = document.createElement("option");
            option.value = this.roomName;
            option.innerHTML = this.roomName;
            this.roomSelect.appendChild(option);
        }

        localStorage.setItem("game", this.gameName);
        localStorage.setItem("room", this.roomName);
        location.hash = "#" + this.gameName + "." + this.roomName;
        document.title = this.gameName;
        this.gameSelect.value = this.gameName;
        this.roomSelect.value = this.roomName;
        this.roomInput.classList.add("hidden");

        const src = "../assets/games/" + this.gameName + "/spec.json?" + Date.now();
        console.log("Loading game", this.gameName, "from", src);
        loadJSON(this.scene, src).then((({models, metadata}) => {
            this.models = models;
            this.metadata = metadata;
            if (metadata.instructions) {

                let i = localStorage.getItem(this.game + "Instructions");
                if (i === metadata.instructions) {
                    this.hideInstructions();
                }else {
                    this.showInstructions();
                }

                this.instructions.innerHTML = metadata.instructions;
            }

        }).bind(this));
    }

    handlers = {
        sync: (data, sender) => {console.log("Received sync from", sender, data);},
        dm: (data, sender) => {console.log("Received DM from", sender, data);},
        chat: (data, sender) => {console.log("Received group chat from", sender, data);},
        moves: (data, sender) => {console.log("Received moves from", sender, data);},
        audio: (data, sender) => {console.log("Received audio from", sender, data);},
        subtitles: (data, sender) => {
            this.subtitles.style.transition = "";
            this.subtitles.style.opacity = 1;
            this.subtitles.innerText = "[" + sender + "] " + data;
            if (this.subtitlesTimeout) {clearTimeout(this.subtitlesTimeout)};
            this.subtitlesTimeout = setTimeout(() => {
                this.subtitles.style.transition = "opacity 3s";
                this.subtitles.style.opacity = 0;
            }, 1000);
        },
    }
    defaultInstructions = `To Move:
    1. Click & drag (then it will snap to position) OR
    2. Click the use arrow keys (then it will snap)

To Rotate:
    1. Double Click OR
    2. Click and use spacebar OR
    3. Right Click and drag to rotate

Software Version: ${window.version}`

    keydownHandlers = {
        " ": () => {
            this.voiceChat.startStreaming();
        }
    }
    keyupHandlers = {
        " ": () => {
            this.voiceChat.stopStreaming();
        }
    }
    hideInstructions(){
        this.instructions.style.display = "none";
        this.q.style.display = "block";
        this.x.style.display = "none";
        localStorage.setItem(this.game + "Instructions", this.metadata.instructions);
    }
    showInstructions(){
        this.instructions.style.display = "block";
        this.q.style.display = "none";
        this.x.style.display = "block";
        localStorage.removeItem(this.game + "Instructions");
    }
    log(message) {
    // add a message to the disappearing log, which should fade in opacity, drift slowly up and disappear after a few seconds
    const log = this.disappearingLog;
    const div = document.createElement("pre");
    div.classList.add("logs");
    div.classList.add("disappearing");
    div.style.opacity = 1;
    div.innerText = message;
    log.appendChild(div);

    // Move all messages up
    Array.from(log.children).forEach((child, index) => {
        // Move each message up by 20px by reading bottom and adding 20px not using translate
        let bottom = parseInt(child.style.bottom) || 0;
        child.style.bottom = (bottom + 20) + "px";
    });

    const x = this.hideLogs;
    const p = this.showLogs;
    if (this.fadeHideLogs) {
        clearInterval(this.fadeHideLogs);
        this.fadeHideLogs = null;
    }
    x.style.opacity = 1;
    p.style.opacity = 1;
    setTimeout((() => {
        x.style.opacity = 1;
        p.style.opacity = 1;
        if (this.fadeHideLogs) {
            clearInterval(this.fadeHideLogs);
            this.fadeHideLogs = null;
        }
        this.fadeHideLogs = setInterval(() => {
            x.style.opacity = Math.max((parseFloat(x.style.opacity) || 0) - 0.01, 0);
            p.style.opacity = Math.max((parseFloat(p.style.opacity) || 0) - 0.01, 0);
        }, 100);
    }).bind(this), 2000);


    // Fade out and move up the new message
    setTimeout(() => {
        div.style.opacity = 0;
//        div.style.transform = "translateY(-80px)"; // Move the new message up by 40px
    }, 1000);

    // Remove the new message after fading out
    setTimeout(() => {
        log.removeChild(div);
    }, 11000);

}

};