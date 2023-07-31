import * as THREE from 'three';

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
        return new THREE.Vector3(x, y, z);
    }
    snapPosition() {
        let p = this.item.position;
        let closest = this.getClosestPosition(p);
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
    constructor(nodes = []) {
        this.nodes = nodes;
        this.getClosestNode = this.getClosestNode.bind(this);
    }
    getClosestNode(v3){
        // reorder nodes
        let distances = this.nodes.map(n => n.distanceTo(v3));
        let min = Math.min(...distances);
        let index = distances.indexOf(min);
        let closest = this.nodes[index];
        return closest
    }
}


export class CubeRotationNodes extends SnapNodes {
    constructor() {
        super([
            new SnapRotationNode(0, 0, 0),
            new SnapRotationNode(Math.PI / 2, 0, 0),
            new SnapRotationNode(Math.PI, 0, 0),
            new SnapRotationNode(Math.PI * 1.5, 0, 0),
            new SnapRotationNode(0, Math.PI / 2, 0),
            new SnapRotationNode(0, Math.PI, 0),
            new SnapRotationNode(0, Math.PI * 1.5, 0),
            new SnapRotationNode(0, 0, Math.PI / 2),
            new SnapRotationNode(0, 0, Math.PI),
            new SnapRotationNode(0, 0, Math.PI * 1.5),
        ]);
    }
    getClosestRotation(v3){
        let step = Math.PI / 2;
        let x = Math.round(v3.x / step) * step;
        let y = Math.round(v3.y / step) * step;
        let z = Math.round(v3.z / step) * step;
        return new SnapRotationNode(x, y, z);
    }
}

export class LatticeNodes extends SnapNodes {
    constructor(step = 1) {
        super();
        this.step = step;
    }
    getClosestNode(v3){
        let step = this.step;
        let x = Math.round(v3.x / step) * step;
        let y = Math.round(v3.y / step) * step;
        let z = Math.round(v3.z / step) * step;
        return new SnapNode(x, y, z);
    }
}


export class SnapController extends SimpleSnapController {
    constructor(item, rotationNodes, positionNodes) {
        super(item);
        this.rotationNodes = rotationNodes || new CubeRotationNodes();
        this.positionNodes = positionNodes || new LatticeNodes();
        this.snap = this.snap.bind(this);
    }
    getClosestRotation(r) {
       return this.rotationNodes.getClosestNode(r);
    }
    getClosestPosition(p) {
        return this.positionNodes.getClosestNode(p);
    }
}