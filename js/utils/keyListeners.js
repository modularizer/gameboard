export class KeyListeners {
    constructor(keydownListeners, keyupListeners) {
        this.keydownListeners = keydownListeners;
        this.keyupListeners = keyupListeners;
        this.getKey = this.getKey.bind(this);

        this.keydown = this.keydown.bind(this);
        this.keyup = this.keyup.bind(this);
        this.addTo = this.addTo.bind(this);
        this.key = null;
    }
    addTo(element) {
        element.addEventListener("keydown", this.keydown);
        element.addEventListener("keyup", this.keyup);
    }
    getKey(e) {
        let k = e.key;
        if (e.shiftKey && k != "Shift") k = "Shift+" + k;
        if (e.altKey && k != "Alt") k = "Alt+" + k;
        if (e.ctrlKey && k != "Control") k = "Ctrl+" + k;
        if (e.metaKey && k != "Meta") k = "Meta+" + k;
        if (e.fnKey && k != "Fn") k = "Fn+" + k;
        return k;
    }
    keydown(e) {
        let k = this.getKey(e);
        this.key = k;
        if (this.keydownListeners[k]) {
            this.keydownListeners[k].bind(this)(e);
        }else{
            this.keydownListeners["default"].bind(this)(e, k);
        }
    }
    keyup(e) {
        this.key = null;
        let k = this.getKey(e);
        if (this.keyupListeners[k]) {
            this.keyupListeners[k].bind(this)(e);
        }else{
            this.keyupListeners["default"].bind(this)(e, k);
        }
    }

}