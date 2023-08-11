import * as THREE from 'three';


let positions = {}



export class CubeRotator extends THREE.Object3D {
    // This class is used to snap the rotation of a cube to a 90 degree increment.
    constructor(parent) {
        super();
        this.parent = parent;
        setInterval(this.snap.bind(this), 10);
    }
    snap() {
        let step = Math.PI / 2;
        let x = Math.round(this.rotation.x / step) * step;
        let y = Math.round(this.rotation.y / step) * step;
        let z = Math.round(this.rotation.z / step) * step;
        this.parent.rotation.set(x, y, z);
    }
}

export class SimpleSnapController {
    // This class is used to snap the rotation of a cube to a 90 degree increment.'
    constructor(item) {
        this.item = item;
        this.snap = this.snap.bind(this);
        this.snapRotation = this.snapRotation.bind(this);
        this.snapPosition = this.snapPosition.bind(this);
        this.getClosestRotation = this.getClosestRotation.bind(this);
        this.getClosestPosition = this.getClosestPosition.bind(this);
    }
    config = {
        enabled: true,
        rotation: {
            enabled: true,
            step: Math.PI / 2,
        },
        position: {
            enabled: true,
            step: 1,
        }
    }
    snap(){
        if (!this.config.enabled) return;
        if (this.config.rotation.enabled) this.snapRotation();
        if (this.config.position.enabled) this.snapPosition();
    }
    checkCollision(newP){
        let s = `${newP.x}, ${newP.y}, ${newP.z}`;
        if (positions[s] && positions[s] !== this.item) return true;
        if (positions[this.item.lastPositionString]){ delete positions[this.item.lastPositionString];}
        positions[s] = this.item;
        this.item.lastPositionString = s;
        return false;
    }
    getClosestRotation(r){
        let step = this.config.rotation.step;
        let x = Math.round(r.x / step) * step;
        let y = Math.round(r.y / step) * step;
        let z = Math.round(r.z / step) * step;
        return new THREE.Vector3(x, y, z);
    }
    snapRotation() {
        let r = this.item.pivot.rotation;
        let closest = this.getClosestRotation(r);
        console.log("closest rotation", closest, r);
        r.set(closest.x, closest.y, closest.z);
    }
    getClosestPosition(p){
        let step = this.config.position.step;
        let x = Math.round(p.x / step) * step;
        let y = Math.round(p.y / step) * step;
        let z = Math.round(p.z / step) * step;
        let newP = new THREE.Vector3(x, y, z);
        if (this.checkCollision(newP)) throw new Error("collision");
        return newP;
    }
    snapPosition() {
        let p = this.item.position;
        let closest = this.getClosestPosition(p, this.item);
        console.log("closest position", closest, p);
        p.set(closest.x, closest.y, closest.z);
    }
}

export class SnapNode extends THREE.Vector3 {
}

export class SnapRotationNode extends SnapNode {
    distanceTo(node) {
        // account for 360 degree rotation wrap around when calculating distance
        let dx = this.diffAngle(this.x, node.x);
        let dy = this.diffAngle(this.y, node.y);
        let dz = this.diffAngle(this.z, node.z);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    diffAngle(a, b){
        // account for 360 degree rotation wrap around when calculating distance
        const c = Math.PI * 2;
        const p3 = 3 * Math.PI;
        a = a % c;
        b = b % c;
        let d = Math.abs((a - b + p3) % c - Math.PI);
        return d;
    }
}

export class SnapNodes {
    constructor(nodes = [], lockedAxes = false, freeAxes = false) {
        this.nodes = nodes;
        this.getClosestNode = this.getClosestNode.bind(this);
        this._getClosestNode = this._getClosestNode.bind(this);
        if (typeof lockedAxes === 'string') lockedAxes = { [lockedAxes]: 0 };
        this.lockedAxes = lockedAxes || {};
        freeAxes = freeAxes || [];
        if (typeof freeAxes === 'string') freeAxes = { x: freeAxes === "x", y: freeAxes === "y", z: freeAxes === "z"};
        if (Array.isArray(freeAxes)) freeAxes = { x: freeAxes.includes('x'), y: freeAxes.includes('y'), z: freeAxes.includes('z') };
        this.freeAxes = freeAxes;
    }
    getClosestNode(v3){
        let node = this._getClosestNode(v3);
        if (this.lockedAxes.x !== undefined) node.x = this.lockedAxes.x;
        if (this.lockedAxes.y !== undefined) node.y = this.lockedAxes.y;
        if (this.lockedAxes.z !== undefined) node.z = this.lockedAxes.z;
        if (this.freeAxes.x) node.x = v3.x;
        if (this.freeAxes.y) node.y = v3.y;
        if (this.freeAxes.z) node.z = v3.z;
        return node
    }
    _getClosestNode(v3){
        // reorder nodes
        let distances = this.nodes.map(n => n.distanceTo(v3));
        let min = Math.min(...distances);
        let index = distances.indexOf(min);
        let closest = this.nodes[index];
        return closest
    }
}


export class CubeRotationNodes extends SnapNodes {
    constructor(lockedAxes = false, freeAxes = false) {
        super([
            new SnapRotationNode(0, 0, 0),
            new SnapRotationNode(Math.PI / 2, 0, 0),
            new SnapRotationNode(Math.PI, 0, 0),
            new SnapRotationNode(Math.PI * 1.5, 0, 0),
            new SnapRotationNode(Math.PI * 2, 0, 0),
            new SnapRotationNode(0, Math.PI / 2, 0),
            new SnapRotationNode(0, Math.PI, 0),
            new SnapRotationNode(0, Math.PI * 1.5, 0),
            new SnapRotationNode(0, Math.PI * 2, 0),
            new SnapRotationNode(0, 0, Math.PI / 2),
            new SnapRotationNode(0, 0, Math.PI),
            new SnapRotationNode(0, 0, Math.PI * 1.5),
            new SnapRotationNode(0, 0, Math.PI * 2),
        ], lockedAxes, freeAxes);
    }
    getClosestRotation(v3){
        let node = this._getClosestRotation(v3);
        if (this.lockedAxes.x !== undefined) node.x = v3.x;
        if (this.lockedAxes.y !== undefined) node.y = v3.y;
        if (this.lockedAxes.z !== undefined) node.z = v3.z;
        if (this.freeAxes.x) node.x = v3.x;
        if (this.freeAxes.y) node.y = v3.y;
        if (this.freeAxes.z) node.z = v3.z;
        return node
    }
    _getClosestRotation(v3){
        let step = Math.PI / 2;
        let x = Math.round(v3.x / step) * step;
        let y = Math.round(v3.y / step) * step;
        let z = Math.round(v3.z / step) * step;
        return new SnapRotationNode(x, y, z);
    }
}


export class GridRotationNodes extends SnapNodes {
    constructor(lockedAxes = false, freeAxes = false) {
        super([
            new SnapRotationNode(0, Math.PI / 2, 0),
            new SnapRotationNode(0, Math.PI, 0),
            new SnapRotationNode(0, Math.PI * 1.5, 0),
            new SnapRotationNode(0, Math.PI * 2, 0),
        ], lockedAxes, freeAxes);
    }
    getClosestRotation(v3){
        let node = this._getClosestRotation(v3);
        if (this.lockedAxes.x !== undefined) node.x = v3.x;
        if (this.lockedAxes.y !== undefined) node.y = v3.y;
        if (this.lockedAxes.z !== undefined) node.z = v3.z;
        if (this.freeAxes.x) node.x = v3.x;
        if (this.freeAxes.y) node.y = v3.y;
        if (this.freeAxes.z) node.z = v3.z;
        return node
    }
    _getClosestRotation(v3){
        let step = Math.PI / 2;
        let x = Math.round(v3.x / step) * step;
        let y = Math.round(v3.y / step) * step;
        let z = Math.round(v3.z / step) * step;
        return new SnapRotationNode(x, y, z);
    }
}

export class LatticeNodes extends SnapNodes {
    constructor(step = 1,
                offset = 0,
                lockedAxes = false,
                freeAxes = false
                ) {
        super([], lockedAxes, freeAxes);
        // if step is a number, use it for all axes
        this.step = (typeof step === "number") ? new THREE.Vector3(step, step, step) : step;
        this.offset = (typeof offset === "number") ? new THREE.Vector3(offset, offset, offset) : offset;
    }
    _getClosestNode(v3){
        let x = Math.round((v3.x - this.offset.x) / this.step.x) * this.step.x + this.offset.x;
        let y = Math.round((v3.y - this.offset.y) / this.step.y) * this.step.y + this.offset.y;
        let z = Math.round((v3.z - this.offset.z) / this.step.z) * this.step.z + this.offset.z;
        return new SnapNode(x, y, z);
    }
}

export class GridNodes extends LatticeNodes {
    constructor(
                step = 1,
                offset = 0,
                lockedAxes = "y",
                freeAxes = false
                ) {
        super(step, offset, lockedAxes, freeAxes);
    }
}


export class SnapController extends SimpleSnapController {
    constructor(item, y = 0, step = 1, offset = 0,
                lockedAxes = "default", freeAxes = false,
                rotationLockedAxes = false, rotationFreeAxes = false,
                positionNodes = "grid", rotationNodes = "cube") {
        super(item);
        if (positionNodes === "grid") positionNodes = new GridNodes(step, offset, (lockedAxes === "default") ? {y} : lockedAxes, freeAxes);
        if (positionNodes === "lattice") positionNodes = new LatticeNodes(step, offset, lockedAxes, freeAxes);
        if (rotationNodes === "cube") rotationNodes = new CubeRotationNodes(rotationLockedAxes, rotationFreeAxes);
        if (rotationNodes === "grid") rotationNodes = new GridRotationNodes(rotationLockedAxes, rotationFreeAxes);
        if (rotationNodes === "up") rotationNodes = new SnapNodes([new SnapRotationNode(0, 0, 0)], rotationLockedAxes, rotationFreeAxes);
        if (rotationNodes === "flip") rotationNodes = new SnapNodes([new SnapRotationNode(0, 0, 0), new SnapRotationNode(0, Math.PI, 0)], rotationLockedAxes, rotationFreeAxes);
        this.rotationNodes = rotationNodes;
        this.positionNodes = positionNodes;
        this.snap = this.snap.bind(this);
    }
    setNodes(positionNodes, rotationNodes) {
        this.rotationNodes = rotationNodes;
        this.positionNodes = positionNodes;
    }
    getClosestRotation(r) {
       return this.rotationNodes.getClosestNode(r);
    }
    getClosestPosition(p) {
        let newP = this.positionNodes.getClosestNode(p);
        console.warn("newP", newP);
        if (this.checkCollision(newP)) throw new Error("collision");
        console.warn("no collision")
        return newP;
    }
}