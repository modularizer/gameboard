import * as THREE from 'three';


let positions = {}


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
// =======================================================================================================
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
        this.enforceLocks(node);
        if (this.freeAxes.x) node.x = v3.x;
        if (this.freeAxes.y) node.y = v3.y;
        if (this.freeAxes.z) node.z = v3.z;
        return node
    }
    sortNodesByDistance(v3){
        // reorder nodes
        let nodesWithDistances = this.nodes.map(n => {
          return {
            node: n,
            distance: n.distanceTo(v3)
          };
        });

        // Sorting by distance
        nodesWithDistances.sort((a, b) => a.distance - b.distance);

        // Extracting the sorted nodes
        let sortedNodes = nodesWithDistances.map(n => n.node);
        return sortedNodes
    }
    _getClosestNode(v3){
        // Extracting the sorted nodes
        let sortedNodes = this.sortNodesByDistance(v3);
        return sortedNodes[0]
    }
    enforceLocks(v3){
        console.log("enforceLocks", v3, this.lockedAxes);
        if (this.lockedAxes.x !== undefined) v3.x = this.lockedAxes.x;
        if (this.lockedAxes.y !== undefined) v3.y = this.lockedAxes.y;
        if (this.lockedAxes.z !== undefined) v3.z = this.lockedAxes.z;
        return v3
    }
}

export class PositionSnapNodes extends SnapNodes {}
export class RotationSnapNodes extends SnapNodes {}

// =======================================================================================================
export class CubeRotationNodes extends RotationSnapNodes {
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

export class GridRotationNodes extends RotationSnapNodes {
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
// =======================================================================================================
export class LatticeNodes extends PositionSnapNodes {
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

// =======================================================================================================


export class SnapController {
    constructor(item, y = 0, step = 1, offset = 0,
                lockedAxes = "default", freeAxes = false,
                rotationLockedAxes = false, rotationFreeAxes = false,
                positionNodes = "grid", rotationNodes = "cube") {
        this.item = item;
        this.snap = this.snap.bind(this);
        this.enforceRotationLocks = this.enforceRotationLocks.bind(this);
        this.enforcePositionLocks = this.enforcePositionLocks.bind(this);
        this.snapRotation = this.snapRotation.bind(this);
        this.snapPosition = this.snapPosition.bind(this);
        this.getClosestRotation = this.getClosestRotation.bind(this);
        this.getClosestPosition = this.getClosestPosition.bind(this);

        if (rotationLockedAxes){
            if (typeof rotationLockedAxes === "string") rotationLockedAxes = { [rotationLockedAxes]: true };
            if (Array.isArray(rotationLockedAxes)) rotationLockedAxes = rotationLockedAxes.reduce((obj, axis) => { obj[axis] = true; return obj; }, {})
            for (let axis in rotationLockedAxes){
                if (rotationLockedAxes[axis] === true) rotationLockedAxes[axis] = item.pivot.rotation[axis];
            }
        }
        if (lockedAxes){
            if (lockedAxes === "default") lockedAxes = {y: y};
            if (typeof lockedAxes === "string") lockedAxes = { [lockedAxes]: true };
            if (Array.isArray(lockedAxes)) lockedAxes = lockedAxes.reduce((obj, axis) => { obj[axis] = true; return obj; }, {})
            for (let axis in lockedAxes){
                if (lockedAxes[axis] === true) lockedAxes[axis] = item.pivot.position[axis];
            }
        }


        if (positionNodes === "grid") positionNodes = new GridNodes(step, offset, (lockedAxes === "default") ? {y} : lockedAxes, freeAxes);
        if (positionNodes === "lattice") positionNodes = new LatticeNodes(step, offset, lockedAxes, freeAxes);
        if (rotationNodes === "cube") rotationNodes = new CubeRotationNodes(rotationLockedAxes, rotationFreeAxes);
        if (rotationNodes === "grid") rotationNodes = new GridRotationNodes(rotationLockedAxes, rotationFreeAxes);
        if (rotationNodes === "up") rotationNodes = new SnapNodes([new SnapRotationNode(0, 0, 0)], rotationLockedAxes, rotationFreeAxes);
        if (rotationNodes === "flip") rotationNodes = new SnapNodes([new SnapRotationNode(0, 0, 0), new SnapRotationNode(0, Math.PI, 0)], rotationLockedAxes, rotationFreeAxes);
        this.rotationNodes = rotationNodes;
        this.positionNodes = positionNodes;
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
    setNodes(positionNodes, rotationNodes) {
        this.rotationNodes = rotationNodes;
        this.positionNodes = positionNodes;
    }
    snap(){
        if (!this.config.enabled) return;
        if (this.config.rotation.enabled) this.snapRotation();
        if (this.config.position.enabled) this.snapPosition();
    }
    snapPosition() {
        let p = this.item.position;
        console.log("snap position", this.item.position, this.item.originCube.position);
        let closest = this.getClosestPosition(p);
        console.log("closest position", closest, p);
        this.item.position.set(closest.x, closest.y, closest.z);
    }
    getClosestPosition(p) {
        let newP = this.positionNodes.getClosestNode(p);
        if (this.checkCollision(newP)) throw new Error("collision");
        return newP;
    }
    getClosestRotation(r) {
       return this.rotationNodes.getClosestNode(r);
    }
    snapRotation() {
        let r = this.item.pivot.rotation;
        let closest = this.getClosestRotation(r);
        console.log("closest rotation", closest, r);
        r.set(closest.x, closest.y, closest.z);
    }
    enforceRotationLocks(newRotation){
        console.log("enforceRotationLocks", newRotation);
        return this.rotationNodes.enforceLocks(newRotation);
    }
    enforcePositionLocks(newPosition){
        console.log("enforcePositionLocks", newPosition);
        return this.positionNodes.enforceLocks(newPosition);
    }

    checkCollision(newP){
        let s = `${newP.x}, ${newP.y}, ${newP.z}`;
        if (positions[s] && positions[s] !== this.item) return true;
        if (positions[this.item.lastPositionString]){ delete positions[this.item.lastPositionString];}
        positions[s] = this.item;
        this.item.lastPositionString = s;
        return false;
    }

}