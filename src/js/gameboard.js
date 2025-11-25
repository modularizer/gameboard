import * as THREE from 'three';
import { RTChat } from 'https://modularizer.github.io/rtchat/bundles/rtchat.esm.min.js';
import { KeyListeners } from './utils/keyListeners.js';
import { CustomScene } from './scene.js';
import { loadJSON } from './components/model.js';
import {gameNames, roomNames} from "./config.js";
// import { VideoChatTHREE } from './components/video-chatTHREE.js';

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
            <select id="playerSelect">
                <option value="pub">Public Observer</option>
                <option value="omni">Omniscient Observer</option>
                <option value="p1">Player 1</option>
                <option value="p2">Player 2</option>
                <option value="p3">Player 3</option>
                <option value="p4">Player 4</option>
            </select><br/>
            <button id="reset">Reset Room</button>
          </div>
          <a id="githubLink" href="https://github.com/modularizer/gameboard" target="_blank" class="widget" style="top: 0; right: 0; background: none; border: none; padding: 0.5em; margin: 0.5em;">
            <svg width="32" height="32" viewBox="0 0 16 16" fill="white" style="display: block;">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
          </a>
          <div id="instructionsBox" class="widget tr" style="top: 50px; width: auto; max-width: 90vw;">
                <button id="q">? Get  Help</button>
                <button id = "x" class="fr hidden">x</button>
                <pre id="instructions" class="hidden">
                </pre>
                <div>
                  <button id="showScore" class="">+ Scorecard</button>
                  <button id="hideScore" class="fr hidden">x Close Scorecard</button>
                </div>
                <score-card id="score" class="hidden" style="min-width: 350px;"></score-card>
          </div>
          <pre id="subtitles" class="widget bc subtitles"></pre>
          <div id="disappearingLog" class="floating bl">

          </div>
          <button id="hideLogs" class="widget logs" style="opacity: 0;">x</button>
          <button id="showLogs" class="widget logs hidden">+</button>
          <div id="chat" class="widget"></div>

        `;
        wrapper.classList.add("fullscreen");
        this.shadowRoot.appendChild(wrapper);

        this.gameNames = gameNames;
        this.roomNames = roomNames;
        this.secretRooms = JSON.parse(localStorage.getItem("secretRooms") || "[]");
        this.roomNames = this.roomNames.concat(this.secretRooms);
        this.roomNames.push("+");

        // bind handlers
        for (let o of [this.handlers, this.keydownHandlers, this.keyupHandlers, this.questionHandlers]){
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

        let topic = location.hash.replace("#", "").split(".");
        if (topic.length == 0){
            topic = "lobby.lobby";
        }else if (topic.length == 1){
            topic = topic[0] + ".lobby";
        }else{
            topic = topic[0] + "." + topic[1];
        }
        this.loadStartTime = Date.now();

        this.rtchat = new RTChat({handlers: this.handlers, questionHandlers: this.questionHandlers, topic: topic, trustMode: "unsafe"}); // VideoChatTHREE disabled
        this.shadowRoot.getElementById("chat").appendChild(this.rtchat);
        this.rtc = this.rtchat.rtc;

        let otherPlayerNames = {};
        this.rtc.on("validation", (peerName)=>{
            setTimeout((()=>{
            console.warn("asking playerName from ", peerName)
            this.rtc.sendRTCQuestion("playerName", peerName).then(({playerName, loadStartTime})=>{
                console.warn("received playerName from ", peerName, (loadStartTime < this.loadStartTime), playerName == this.playerName)
                if ((loadStartTime < this.loadStartTime) && (playerName == this.playerName)){
                    try{
                        let n = parseInt(playerName.replace("p", ""));
                        for (let i = 1; i < 5; i++){
                            if ((i != n) && (!otherPlayerNames["p" + i])){;
                                console.warn("switching playerName", n, i)
                                this.log("Switching to p" + i);
                                this.playerSelect.value = "p" + i;
                                // set hash
                                location.hash = "#" + this.gameName + "." + this.roomName + ".p" + i;
                                console.warn("Reloading", location.hash);
                                location.reload();
                                return
                            }
                        }
                    }catch(e){
                        console.error(e);
                    }
                }else{
                    otherPlayerNames[playerName] = peerName;
                }
            });}).bind(this),200);
        })


        this.keyListeners = new KeyListeners(this.keydownHandlers, this.keyupHandlers);
        this.keyListeners.addTo(window);
        this.scene = new CustomScene();
        this.scene.onlog = this.log.bind(this);
        this.scene.attachMQTTRTC(this.rtc);
        this.onDocumentLoad();

    }
    onDocumentLoad() {
        window.g = this;
        this.saveElements();
        this.bindElements();
        this.loadGame();
    }
    saveElements(){
        this.instructions = this.shadowRoot.getElementById("instructions");
        this.instructionsBox = this.shadowRoot.getElementById("instructionsBox");
        this.q = this.shadowRoot.getElementById("q");
        this.x = this.shadowRoot.getElementById("x");
        this.showScore = this.shadowRoot.getElementById("showScore");
        this.hideScore = this.shadowRoot.getElementById("hideScore");
        this.score = this.shadowRoot.getElementById("score");
        this.gameSelect = this.shadowRoot.getElementById("gameSelect");
        this.roomSelect = this.shadowRoot.getElementById("roomSelect");
        this.playerSelect = this.shadowRoot.getElementById("playerSelect");
        this.roomInput = this.shadowRoot.getElementById("roomInput");
        this.reset = this.shadowRoot.getElementById("reset");
        this.chat = this.shadowRoot.getElementById("chat");
        this.subtitles = this.shadowRoot.getElementById("subtitles");
        this.disappearingLog = this.shadowRoot.getElementById("disappearingLog");
        this.sceneBox = this.shadowRoot.getElementById("sceneBox");
        this.hideLogs = this.shadowRoot.getElementById("hideLogs");
        this.showLogs = this.shadowRoot.getElementById("showLogs");
    }
    bindElements(){
        this.q.addEventListener("click", (() => {
            this.showInstructions();
        }).bind(this));
        this.x.addEventListener("click", (() => {
            this.hideInstructions();
        }).bind(this));
        this.instructions.addEventListener("click", (() => {
            this.hideInstructions();
        }).bind(this));
        this.showScore.addEventListener("click", (() => {
            this.showScoreCard();
        }).bind(this));
        this.hideScore.addEventListener("click", (() => {
            this.hideScoreCard();
        }).bind(this));
        this.reset.addEventListener("click", (() => {
            this.scene.reset();
            location.reload();
        }).bind(this));
        this.playerSelect.addEventListener("change", (e => {
            this.playerName = e.target.value;
            localStorage.setItem("playerName", e.target.value);
            location.hash = "#" + this.gameName + "." + this.roomName + "." + this.playerName;
            location.reload();
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
            location.hash = "#" + this.gameName + "." + this.roomName + "." + this.playerName;
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
                location.hash = "#" + this.gameName + "." + this.roomName + "." + this.playerName;
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



        this.score.addEventListener("save", (e)=>{
            this.rtc.send(e.detail, "score");
        })
        this.rtc.rtcHandlers.score = (data, sender) => {
            this.score.fromCSV(data);
        }
    }
    loadGame(){
        console.log("loadGame() called");
        const hashParts = location.hash.replace("#", "").split(".");

        this.gameName = (hashParts && this.gameNames.includes(hashParts[0]))? hashParts[0] : (localStorage.getItem("game") || "lobby");
        this.roomName = (hashParts.length >= 2) ? hashParts[1] : (localStorage.getItem("room") || "lobby");
        this.playerName = (hashParts.length >= 3) ? hashParts[2] : (localStorage.getItem("playerName") || "pub");
        console.log("Game name set to:", this.gameName);
        this.playerSelect.value = this.playerName;
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
        localStorage.setItem("playerName", this.playerName);
        location.hash = "#" + this.gameName + "." + this.roomName + "." + this.playerName;
        document.title = this.gameName;
        this.gameSelect.value = this.gameName;
        this.roomSelect.value = this.roomName;
        this.roomInput.classList.add("hidden");

        const src = "./assets/games/" + this.gameName + "/spec.json?" + Date.now();
        // console.log("Loading JSON from:", src);
        loadJSON(this.scene, src, this.playerName).then((({models, metadata, scorecard}) => {
            // console.log("loadJSON promise resolved");
            // console.log("metadata:", metadata);
            // console.log("metadata.instructions exists?", !!metadata.instructions);
            this.models = models;
            this.metadata = metadata;

            this.score.fromCSV(scorecard, false);
            let csv2 = localStorage.getItem(location.hash + 'score-card');
            if (csv2) {
                scorecard = csv2;
                this.score.fromCSV(scorecard);
            }
            
            // Check if scorecard should be visible for this room
            let scorecardVisible = localStorage.getItem(location.hash + 'scorecardVisible');
            if (scorecardVisible === "true") {
                this.showScoreCard();
            } else {
                this.hideScoreCard();
            }

            if (metadata.instructions) {
                this.instructions.innerHTML = metadata.instructions;
            }
            
            // Check if user has dismissed instructions for this game before
            let dismissed = localStorage.getItem(this.gameName + "InstructionsDismissed");
            console.log("Game:", this.gameName);
            console.log("Dismissed flag:", dismissed);
            console.log("Should show?", dismissed !== "true");
            if (dismissed !== "true") {
                // Not dismissed before, so show them
                console.log("Calling showInstructions()");
                this.showInstructions();
            } else {
                console.log("Leaving instructions hidden");
            }

        }).bind(this));
        
        // Also check immediately in case the game is already loaded
        setTimeout(() => {
            let dismissed = localStorage.getItem(this.gameName + "InstructionsDismissed");
            if (dismissed !== "true" && this.instructions.innerHTML) {
                this.showInstructions();
            }
        }, 100);
    }
    showScoreCard(){
        this.score.classList.remove("hidden");
        this.score.style.minWidth = "300px";
        this.score.style.minHeight = "200px";
        this.hideScore.classList.remove("hidden");
        this.showScore.classList.add("hidden");
        this.instructionsBox.style.minWidth = "350px";
        localStorage.setItem(location.hash + 'scorecardVisible', 'true');
    }
    hideScoreCard(){
        this.score.classList.add("hidden");
        this.score.style.minWidth = "";
        this.score.style.minHeight = "";
        this.hideScore.classList.add("hidden");
        this.showScore.classList.remove("hidden");
        this.instructionsBox.style.minWidth = "";
        localStorage.setItem(location.hash + 'scorecardVisible', 'false');
    }

    handlers = {
        sync: (data, sender) => {console.log("Received sync from", sender, data);},
        dm: (data, sender) => {console.log("Received DM from", sender, data);},
        chat: (data, sender) => {
            console.log("Received group chat from", sender, data);
            // Call RTChat's internal handler to display message in ChatBox
            if (this.rtc && this.rtc.emit) {
                this.rtc.emit('chat', data, sender);
            }
        },
        moves: (data, sender) => {console.log("Received moves from", sender, data);},
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
        score: (data, sender) => {console.log("Received score from", sender, data);},
    }
    questionHandlers = {
        playerName: ()=>{return {playerName: this.playerName, loadStartTime: this.loadStartTime}},
        state: ()=>{return this.state}
    }


    defaultInstructions = `Welcome to gameboard!

1. Choose a game, room, and player number
2. Copy the url to invite your friends
3. Use the chat to make sure everyone is ready
4. Play! It is just a "physical" board 
   so it is up to you to play by the rules
    
To Move:
    Click on a piece, drag, then release

To Rotate A Piece:
    Double click on the piece
   
To Rotate the view:
    Click and drag the floor

For more info:
    https://github.com/modularizer/gameboard

Software Version: ${window.version}`

    keydownHandlers = {
        "Control+ ": () => {
            this.voiceChat.startStreaming();
        }
    }
    keyupHandlers = {
        "Control+ ": () => {
            this.voiceChat.stopStreaming();
        }
    }
    hideInstructions(){
        this.instructions.classList.add("hidden");
        this.q.classList.remove("hidden");
        this.x.classList.add("hidden");
        // Mark that user has dismissed instructions for this game
        localStorage.setItem(this.gameName + "InstructionsDismissed", "true");
    }
    showInstructions(){
        console.log("showInstructions called");
        console.log("this.instructions:", this.instructions);
        console.log("this.q:", this.q);
        console.log("this.x:", this.x);
        this.instructions.classList.remove("hidden");
        this.q.classList.add("hidden");
        this.x.classList.remove("hidden");
        console.log("Instructions classes after:", this.instructions.className);
        console.log("Q classes after:", this.q.className);
        console.log("X classes after:", this.x.className);
        // Remove dismissed flag so instructions show again next time
        localStorage.removeItem(this.gameName + "InstructionsDismissed");
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

    get state(){
        return this.scene.getDiffFromFreshState();
    }
    set state(state){
        this.scene.applyDiffFromFreshState(state);
    }


};