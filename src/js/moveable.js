export class MoveableItem{
    constructor(item, position, rotation){
        this.item = item;
        if (position){
            this.initialPosition = {x: position.x, y: position.y, z: position.z};
        }else{
            this.initialPosition = {x: item.originCube.position.x, y: item.originCube.position.y, z: item.originCube.position.z};
        }
        if (rotation){
            this.initialRotation = {x: rotation.x, y: rotation.y, z: rotation.z};
        }else{
            this.initialRotation = {x: item.pivot.rotation.x, y: item.pivot.rotation.y, z: item.pivot.rotation.z};
        }
        this.item.clickRelativePosition = null;
        this.item.movestate = {
            animation: {
                started: false,
                rotation: {
                    enabled: false,
                    cycles: null,
                    x: 0,
                    y: 0,
                    z: 0,
                },
                translation: {
                    enabled: false,
                    cycles: null,
                    x: 0,
                    y: 0,
                    z: 0,
                },
                lastMoveTime: null,
                lastRotationTime: null,
                lastTranslationTime: null,
            },

        }
        this.item.reset = this.reset.bind(this);
        this.item.jumpTo = this.jumpTo.bind(this);
        this.item.moveTo = this.moveTo.bind(this);
        this.item.move = this.move.bind(this);
        this.item.setRotation = this.setRotation.bind(this);
        this.item.spinTo = this.spinTo.bind(this);
        this.item.spin = this.spin.bind(this);
        this.item.startRotation = this.startRotation.bind(this);
        this.item.stopRotation = this.stopRotation.bind(this);
        this.item.startTranslation = this.startTranslation.bind(this);
        this.item.stopTranslation = this.stopTranslation.bind(this);
        this.item.moveFrame = this.moveFrame.bind(this);
        this.item.rotationFrame = this.rotationFrame.bind(this);
        this.item.translationFrame = this.translationFrame.bind(this);
        this.item.flip = this.flip.bind(this);


        return this.item;
    }


    reset(){
        this.item.position.x = this.initialPosition.x;
        this.item.position.y = this.initialPosition.y;
        this.item.position.z = this.initialPosition.z;
        this.item.pivot.rotation.x = this.initialRotation.x;
        this.item.pivot.rotation.y = this.initialRotation.y;
        this.item.pivot.rotation.z = this.initialRotation.z;
        this.item.movestate = {
            animation: {
                rotation: {
                    enabled: false,
                    x: 0,
                    y: 0,
                    z: 0,
                },
                translation: {
                    enabled: false,
                    x: 0,
                    y: 0,
                    z: 0,
                }
            }
        }
    }
    flip(){
        this.item.rotation.x += Math.PI;
    }
    jumpTo(x, y, z){
        this.item.originCube.position.x = x;
        this.item.originCube.position.y = Math.max(y, 0);// TODO: make sure it doesn't rotate below the ground (y=0)
        this.item.originCube.position.z = z;
    }
    moveTo(x, y, z, duration, speed=0.01){
        let dx = x-this.item.originCube.position.x;
        let dy = y-Math.max(this.item.originCube.position.y, 0);
        let dz = z-this.item.originCube.position.z;
        this.move(dx, dy, dz, duration, speed);
    }
    move(dx, dy, dz, duration, speed=0.01){
        dy = Math.max(dy, -this.item.originCube.position.y); // TODO: make sure it doesn't rotate below the ground (y=0)
        let distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        let fps=60; // FIXME: use timestamp or actual fps
        if (duration){
            speed = distance/(duration*fps);
        }
        let sx = speed * dx/distance;
        let sy = speed * dy/distance;
        let sz = speed * dz/distance;

        this.item.movestate.animation.translation = {
            enabled: true,
            cycles: Math.floor(distance/speed),
            x: sx,
            y: sy,
            z: sz,
        }
    }
    spinTo(x, y, z, duration, speed=0.02){
        let dx = x-this.item.rotation.x;
        let dy = y-this.item.rotation.y;
        let dz = z-this.item.rotation.z;
        this.spin(dx, dy, dz, duration, speed);
    }
    spin(dx, dy, dz, duration, speed=0.02){
        if (duration){
            speed = dx/(duration * 60);
        }
        let distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        let sx = speed * dx/distance;
        let sy = speed * dy/distance;
        let sz = speed * dz/distance;
        this.item.movestate.animation.rotation = {
            enabled: true,
            cycles: Math.floor(distance/speed),
            x: sx,
            y: sy,
            z: sz,
        }
    }
    setRotation(x, y, z){
        // TODO: make sure it doesn't rotate below the ground (y=0)
        this.item.pivot.rotation.x = x;
        this.item.pivot.rotation.y = y;
        this.item.pivot.rotation.z = z;
    }
    translate(x, y, z){
        this.item.originCube.position.x += x;
        this.item.originCube.position.y = Math.max(0, this.item.originCube.position.y + y) // TODO: make sure it doesn't rotate below the ground (y=0)
        this.item.originCube.position.z += z;
    }
    rotate(x, y, z){
        this.item.pivot.rotation.x += x;
        this.item.pivot.rotation.y += y;
        this.item.pivot.rotation.z += z;
    }

    startRotation(speedx=0.02, speedy=0.01, speedz=0, cycles=null){
        this.item.movestate.animation.rotation = {
            enabled: true,
            cycles: cycles,
            x: speedx,
            y: speedy,
            z: speedz,
        }
    }
    stopRotation(){
        this.item.movestate.animation.rotation.enabled = false;
    }
    startTranslation(speedx=0.02, speedy=0.01, speedz=0, cycles=null){
        this.item.movestate.animation.translation = {
            enabled: true,
            x: speedx,
            y: speedy,
            z: speedz,
        }
    }
    stopTranslation(){
        this.item.movestate.animation.translation.enabled = false;
    }
    moveFrame(t){
        this.item.movestate.animation.lastMoveTime = t;
        if (this.item.movestate.animation.rotation.enabled){
            this.rotationFrame(t);
        }
        if (this.item.movestate.animation.translation.enabled){
            this.translationFrame(t);
        }
    }
    rotationFrame(t){
        this.item.movestate.animation.lastRotationTime = t;
        let r = this.item.movestate.animation.rotation;
        this.rotate(r.x, r.y, r.z);
        if (r.cycles === 0){
            this.stopRotation();
        }else if (r.cycles != null){
            r.cycles--;
        }
    }
    translationFrame(t){
        this.item.movestate.animation.lastTranslationTime = t;
        let tr = this.item.movestate.animation.translation;
        this.translate(tr.x, tr.y, tr.z);
        if (tr.cycles === 0){
            this.stopTranslation();
        }else if (tr.cycles != null){
            tr.cycles--;
        }
    }


    onRightClickDown(event) {

    }
    onRightClickMove(event) {

    }
    onRightClickUp(event) {

    }

}