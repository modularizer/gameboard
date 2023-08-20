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
          <div id="select" class="widget tl">
            <select id="gameSelect">
                <option>Please select a game</option>
            </select><br/>
            <select id="roomSelect">
                <option>Please select a room</option>
            </select>
            <input id="roomInput" placeholder="Room Name" class="hidden"></input>
          </div>
          <div id="instructionsBox" class="widget tr">
                <button id="q">?</button>
                <button id = "x" class="fr hidden">x</button>
                <pre id="instructions" class="hidden">
                </pre>
          </div>
          <pre id="subtitles" class="widget bc subtitles"></pre>
          <chat-box id="chat"></chat-box>
        `;
        wrapper.classList.add("fullscreen");
        this.shadowRoot.appendChild(wrapper);

        this.gameNames = ["quoridor", "chess", "cube", "card"]
        this.roomNames = ["octopus", "snail", "tree", "tortoise", "anchovie", "punctuation", "kettle", "circular", "squirrel", "caterpillar", "cucumber", "lightbulb", "snorkel", "giraffe", "chocolate", "+"];

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
        this.scene.attachMQTTRTC(this.rtc);
        console.log("Gameboard constructed");
        this.onDocumentLoad();

    }
    onDocumentLoad() {
        console.log("document loaded");
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
            let option = document.createElement("option");
            option.value = game;
            option.innerHTML = game;
            this.gameSelect.appendChild(option);
        }
        for (let room of this.roomNames){
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
                location.hash = "#" + this.gameName + "." + this.roomName;
                location.reload();
            }
        }).bind(this));
        this.roomInput.addEventListener("change", (e => {
            this.roomName = e.target.value;
            location.hash = "#" + this.gameName + "." + this.roomName;
            location.reload();
        }).bind(this));

        this.instructions.innerHTML = this.defaultInstructions;
        console.log(this.chat)
        this.chat.attachMQTTRTC(this.rtc);
        console.log("Bound elements");
    }
    loadGame(){
        const hashParts = location.hash.replace("#", "").split(".");

        this.gameName = (hashParts && this.gameNames.includes(hashParts[0]))? hashParts[0] : (localStorage.getItem("game") || "chess");
        this.roomName = (hashParts.length >= 2) ? hashParts[1] : (localStorage.getItem("room") || "octopus");

        localStorage.setItem("game", this.gameName);
        localStorage.setItem("room", this.roomName);
        location.hash = "#" + this.gameName + "." + this.roomName;
        document.title = this.gameName;
        this.gameSelect.value = this.gameName;
        this.roomSelect.value = this.roomName;
        this.roomInput.classList.add("hidden");

        const src = "../../assets/games/" + this.gameName + "/spec.json?" + Date.now();
        console.log("Loading game", this.gameName, "from", src);
        loadJSON(this.scene, src).then((({models, metadata}) => {
            if (metadata.instructions) {
                let i = localStorage.getItem(game + "Instructions");
                if (i === metadata.instructions) {
                    this.hideInstructions();
                }else {
                    this.showInstructions();
                }

                this.instructions.innerHTML = metadata.instructions;
            }
            this.models = models;
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
    3. Right Click and drag to rotate`

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
        document.getElementById("instructions").style.display = "none";
        document.getElementById("q").style.display = "block";
        document.getElementById("x").style.display = "none";
        localStorage.setItem(game + "Instructions", window.metadata.instructions);
    }
    showInstructions(){
        document.getElementById("instructions").style.display = "block";
        document.getElementById("q").style.display = "none";
        document.getElementById("x").style.display = "block";
        localStorage.removeItem(game + "Instructions");
    }
};