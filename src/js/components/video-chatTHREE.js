import { BasicVideoChat } from 'https://modularizer.github.io/rtchat/rtchat.js';
//import { BasicVideoChat } from 'http://localhost:63342/rtchat/rtchat.js';

class VideoChatTHREE extends BasicVideoChat {
    constructor(rtc) {
        super(rtc);
        this.setVideoSrc = this.setVideoSrc.bind(this);
        this.hide();
    }
    show() {

    }
    get gameboard() {
        return window.g
    }
    get playerName() {
        return this.gameboard.playerName;
    }
    get videos() {
        return window.THREEVideos;
    }
    setLocalSrc(stream) {
        super.setLocalSrc(stream);
        let id = "videochat-" + ((this.playerName === "p1")?"p1":"p2");
        console.log("setting local src", id, this.videos, stream);
        let localVideo = this.setVideoSrc(id, stream);
        localVideo.muted = true;
    }
    setRemoteSrc(stream, name) {
        super.setRemoteSrc(stream, name);
        let id = "videochat-" + ((this.playerName === "p1")?"p2":"p1");
        console.log("setting remote src", id, this.videos, stream);
        this.setVideoSrc(id, stream);
    }

    setVideoSrc(id, stream) {
        let d = this.videos[id];
        if (d){
            d.element.srcObject = stream;
            if (stream){
                d.material.transparent= false;
                d.material.opacity = 1;
            }else{
                d.material.transparent= true;
                d.material.opacity = 0;
            }
        }
        return d.element;
    }
}
customElements.define('videochat-three', VideoChatTHREE);
export { VideoChatTHREE };