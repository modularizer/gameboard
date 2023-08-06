export class MouseListeners {
    constructor(parent){
        parent.onMouseDown = parent.onMouseDown.bind(parent) || function(){};
        parent.onMouseMove = parent.onMouseMove.bind(parent) || function(){};
        parent.onMouseUp = parent.onMouseUp.bind(parent) || function(){};
        this.parent = parent;
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
    }
    setSimulatedMouseButton(button) {
        this.state.simulatedMouseButton = button;
    }

    addTo(element) {
        element.addEventListener("mousedown", this.onMouseDown.bind(this));
        element.addEventListener("mousemove", this.onMouseMove.bind(this));
        element.addEventListener("mouseup", this.onMouseUp.bind(this));
        element.addEventListener("touchstart", this.onTouchStart.bind(this));
        element.addEventListener("touchmove", this.onTouchMove.bind(this));
        element.addEventListener("touchend", this.onTouchEnd.bind(this));
    }

    state = {
        clickedButton: null,
        simulatedMouseButton: null,
    }
    onMouseDown(event, touch) {
        event.preventDefault();
        let button = this.state.simulatedMouseButton != null ? this.state.simulatedMouseButtom : event.button;
        this.state.clickedButton = button;
        this.parent.onMouseDown(event, button, touch);
    }
    onMouseMove(event, touch) {
        event.preventDefault();
        this.parent.onMouseMove(event, this.state.clickedButton, touch);
    }
    onMouseUp(event, touch) {
        event.preventDefault();
        let button = this.state.clickedButton;
        this.state.clickedButton = null;
        this.parent.onMouseUp(event, button, touch);
    }
    onTouchStart(event) {
        event.preventDefault();
        if(event.touches) { // Check if this is a touch event
            // Update event to use first touch event
            event.clientX = event.touches[0].clientX;
            event.clientY = event.touches[0].clientY;
        }
        this.onMouseDown(event, true);
    }
    onTouchMove(event) {
        event.preventDefault();
        if(event.touches) { // Check if this is a touch event
            // Update event to use first touch event
            event.clientX = event.touches[0].clientX;
            event.clientY = event.touches[0].clientY;
        }
        this.onMouseMove(event, true);
    }
    onTouchEnd(event) {
        event.preventDefault();
        this.onMouseUp(event, true);
    }
}