import * as THREE from 'three';;
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { SnapController } from '../snapControl.js';
import { DeferredPromise } from '../utils/deferredPromise.js';


export class BaseModel extends THREE.Group {
    constructor(loadPromise) {
        super();
        this.zone = null;
        this.activeZones = [];
        this.pendingZones = [];
        this.contents = [];
        this.zones = [];

        this.truePivot = new THREE.Object3D();
        this.pivot = this.truePivot;
        this.pivot.position.copy(this.position);

        this.castShadow = this.config.castShadow;
        this.receiveShadow = this.config.receiveShadow;
        this.checkZones = this.checkZones.bind(this);
        this.snap = this.snap.bind(this);
        this.setPosition = this.setPosition.bind(this);


        this.loadPromise = loadPromise;
        this.loaded = false;

        this.wireframe = null;
        this.shell = null;
        this.originCube = null;

        // make a simple cube that we will replace with the model when it loads
        this.cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
//        this.add(this.cube);
        this.truePivot.add(this.cube);



        this.loadPromise.then(((model) => {
            if (typeof model === "object" && model.config && model.model) {
                this.config = model.config;
                this.position.set(model.position.x, model.position.y, model.position.z);
                this.rotation.set(model.rotation.x, model.rotation.y, model.rotation.z);
                this.truePivot.position.set(model.pivotPosition.x, model.pivotPosition.y, model.pivotPosition.z);
                this.truePivot.rotation.set(model.pivotRotation.x, model.pivotRotation.y, model.pivotRotation.z);

                let loader = new THREE.ObjectLoader();
                model = loader.parse(model.model);
                this.model = model;
                this.add(model);

                // Add the model to the truePivot group

                this.truePivot.add(this.model);
                this.add(this.truePivot);
                this.addOriginCube();
                this.addWireframe();
                this.addShell(0xffffff);
                this.truePivot.add(this.wireframe);
                this.truePivot.add(this.originCube);
                this.truePivot.add(this.shell);

                this.snapController = new SnapController(this);
                this.setShadow(this.config.castShadow, this.config.receiveShadow);
            }else{
                this.model = model;

                model.castShadow = this.config.castShadow;
                model.receiveShadow = this.config.receiveShadow;

                this.add(model);
                let box = this.getBoundingBox();
                let size = this.getSize();

                // Compute the center of the bounding box
                let center = box.getCenter(new THREE.Vector3());

                // move the model so that its origin is at the center of the bounding box
//                model.position.set(-center.x, 0, -center.z);

                // Add the model to the truePivot group


                this.truePivot.add(this.model);
                this.add(this.truePivot);


                // adjust the position of the truePivot to align its origin with the minimum corner of the model's bounding box
                this.truePivot.position.set(size.x/2, 0, size.z/2);
//                this.model.position.set(0, size.y/2, 0);

                this.addOriginCube();
                this.addWireframe();
                this.addShell(0xffffff);
                this.truePivot.add(this.wireframe);
                this.truePivot.add(this.originCube);
                this.truePivot.add(this.shell);

                this.snapController = new SnapController(this);

                this.setShadow(this.config.castShadow, this.config.receiveShadow);

            }

            this.loaded = true;

            this.remove(this.cube);
            this.truePivot.remove(this.cube);
            delete this.cube;
        }).bind(this))
    }

    keydown(event, k){
        console.log("handling keydown", event, k)
        if (this.keydownListeners[k]){
            this.keydownListeners[k](event);
        }
    }
    keyup(event, k){
        if (this.keyupListeners[k]){
            this.keyupListeners[k](event);
        }
    }
    keydownListeners = {
        "ArrowRight": (event) => {
            this.pivot.rotateY(Math.PI/2);
        },
        "ArrowLeft": (event) => {
            this.pivot.rotateY(-Math.PI/2);
        },
        "Ctrl+ ": (event) => {
            this.toggleCover();
        }
    }
    keyupListeners = {


    }
    toggleCover(){
        if (this.shell.visible){
            this.uncover();
        }else{
            this.cover();
        }
    }
    cover(){
        this.shell.visible = true;
    }
    uncover(){
        this.shell.visible = false;
    }
    setShellColor(color){
        this.shell.material.color.set(color);
    }


    toJSON(){
        return {
            isModelCopy: true,
            position: this.position,
            rotation: this.rotation,
            config: this.config,
            model: this.model.toJSON(),
            pivotPosition: this.truePivot.position,
            pivotRotation: this.truePivot.rotation,
        }
    }
    setSnapNodes(nodes){
        if (!this.model){return this.loadPromise.then(this.setSnapNodes.bind(this, nodes))}
        this.snapController.positionNodes = nodes;
    }
    setSnapController(...args){
        if (!this.model){return this.loadPromise.then(this.setSnapController.bind(this, ...args))}
        this.snapController = new SnapController(this, ...args);
    }
    setShadow(cast = true, receive = true){
        this.castShadow = cast;
        this.receiveShadow = receive;
        if (!this.model){return this.loadPromise.then(this.setShadow.bind(this, cast, receive))}
        if (this.model){
            this.model.castShadow = cast;
            this.model.receiveShadow = receive;
            for (let child of this.model.children){
                child.castShadow = cast;
                child.receiveShadow = receive;
            }
        }
    }
    snap(){
        if (!this.model){return this.loadPromise.then(this.snap.bind(this))}
        if (this.config.snap && this.snapController){
            try{
            this.snapController.snap();
            }catch(e){}
        }
    }

    config = {
        snap: true,
        castShadow: true,
        receiveShadow: true,
        wireframe: {
            visible: false,
            color: 0x00ff00,
            thickness: 2,
        },
        originCube: {
            visible: false,
            color: 0x00ffff,
            thickness: 0.2,
        },
        selected: {
            scale: 1.05,
            wireframe: true,
            originCube: true,
            offset: new THREE.Vector3(0, 0.5, 0)
        }
    }
    getBoundingBox() {

      var box = new THREE.Box3();

      this.traverse(function (child) {
        if (child.isMesh) {
          child.geometry.computeBoundingBox();
          var childBox = child.geometry.boundingBox.clone();
          childBox.applyMatrix4(child.matrixWorld);
          box.union(childBox);
        }
      });

      // offset the box by the model's position
      box.min.add(this.model.position);
      box.max.add(this.model.position);

      return box;
    }
    getSize(){
        let size = new THREE.Vector3();
        let box = this.getBoundingBox();
        box.getSize(size);
        return size;
    }
    getRepresentativeSize(){
        let size = this.getSize();
        let sizes = [size.x, size.y, size.z];
        sizes.sort();
        let avgSize = (sizes[0] + sizes[1]) / 2;
        return avgSize;
    }
    addOriginCube(){
      // Create a small cube at the object's origin
        let s = this.getRepresentativeSize();
        let t = this.config.originCube.thickness;
        const geometry = new THREE.BoxGeometry(s*t, s*t, s*t);
        const material = new THREE.MeshBasicMaterial({color: this.config.originCube.color});
        const cube = new THREE.Mesh(geometry, material);
        cube.visible = this.config.originCube.visible;
        this.originCube = cube;
    }
    addWireframe(offset=0.01) {
        let boundingBox = this.getBoundingBox(); // Assume this method returns a THREE.Box3
        let boxGeometry = new THREE.BoxGeometry(
            (2 * offset) + boundingBox.max.x - boundingBox.min.x,
            (2 * offset) + boundingBox.max.y - boundingBox.min.y,
            (2 * offset) + boundingBox.max.z - boundingBox.min.z
        );

        boxGeometry.translate(
            (boundingBox.min.x + boundingBox.max.x) / 2,
            (boundingBox.min.y + boundingBox.max.y) / 2,
            (boundingBox.min.z + boundingBox.max.z) / 2
        );

        let edges = new THREE.EdgesGeometry(boxGeometry);

        // create a LineGeometry
        let geometry = new LineGeometry();
        geometry.setPositions( edges.attributes.position.array );

        let avgSize = this.getRepresentativeSize();
        let s = avgSize * this.config.wireframe.thickness;

        // create a LineMaterial and specify the color and linewidth
        let material = new LineMaterial({
            color: this.config.wireframe.color,
            linewidth: s,  // Set the line width here
        });

        // create a Line2 (Line with width) and store it
        let wireframeMesh = new Line2(geometry, material);

        // You must call this method after any change to line properties, including the position of the camera
        material.resolution.set(window.innerWidth, window.innerHeight);
        wireframeMesh.visible = this.config.wireframe.visible;
        this.wireframe = wireframeMesh;
    }
    addShell(color=0xffffff, visible=true, offset=0.01) {
        let boundingBox = this.getBoundingBox(); // Assume this method returns a THREE.Box3
        let boxGeometry = new THREE.BoxGeometry(
            (2 * offset) + boundingBox.max.x - boundingBox.min.x,
            (2 * offset) + boundingBox.max.y - boundingBox.min.y,
            (2 * offset) + boundingBox.max.z - boundingBox.min.z
        );

        boxGeometry.translate(
            ((boundingBox.min.x + boundingBox.max.x) / 2),
            ((boundingBox.min.y + boundingBox.max.y) / 2),
            ((boundingBox.min.z + boundingBox.max.z) / 2)
        );

        // add a box shell all of a single color
        let boxMaterial = new THREE.MeshBasicMaterial({ color: color, side: THREE.FrontSide });
        let boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
        boxMesh.visible = visible;
        this.shell = boxMesh;
        return this.shell;
    }
    setColor(color){
        if (!this.model){
            this.cube.material.color.set(color);
            return this.loadPromise.then(() => {this.setColor(color)})
        };

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // if the object uses multiple materials
                if (Array.isArray(child.material)) {
                    child.material.forEach((material) => {
                        material.color.set(color); // change to red
                    });
                }
                // if the object uses a single material
                else {
                    child.material.color.set(color); // change to red
                }
            }
        });
    }
    setOpacity(opacity=1){
        if (!this.model){
            this.cube.material.opacity = opacity;
            this.cube.material.transparent = opacity < 1;
            return this.loadPromise.then(() => {this.setOpacity(opacity)})
        };

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // if the object uses multiple materials
                if (Array.isArray(child.material)) {
                    child.material.forEach((material) => {
                        material.opacity = opacity;
                        material.transparent = opacity < 1;
                    });
                }
                // if the object uses a single material
                else {
                    child.material.opacity = opacity;
                    child.material.transparent = opacity < 1;
                }
            }
        });
    }
    setPosition(...args){
        if (args.length === 1){
            this.position.set(args[0].x, args[0].y, args[0].z);
        }else{
            this.position.set(...args);
        }

        try{
            if (!this.loaded){return this.loadPromise.then(()=>{this.setPosition(...args)})}
            this.checkZones();
        }catch(e){console.warn(e)}
    }
    checkZones(force=false){
        let method;
        let part;

        this.zones.forEach(zone=>{
            const box = new THREE.Box3().setFromObject(zone.shell);
            const alreadyInZone = this.activeZones.includes(zone);
            const nowInZone = box.containsPoint(this.position);


            if (alreadyInZone !== nowInZone){
                if (!nowInZone){
                    this.activeZones = this.activeZones.filter(z=>z !== zone);
                }else{
                    this.activeZones.push(zone);
                }


                if (zone.movezone){
                    this.setZone(zone, "movezone", nowInZone);
                }
                if (zone.dropzone){
                    if (!this.selected){
                        this.setZone(zone, "dropzone", nowInZone);
                    }else{
                        this.pendingZones.push(zone);
                    }
                }
            }else if ((!this.selected) && nowInZone && this.pendingZones.includes(zone)){
                if (zone.dropzone){
                    this.setZone(zone, "dropzone", nowInZone);
                }
                this.pendingZones = this.pendingZones.filter(z=>z !== zone);
            }
        })
    }
    setZone(zone, mode, nowInZone){
        if (!zone[mode]){return}
        let fullMethod = zone[mode][1 - 1*nowInZone];
        if (!fullMethod){return}
        if (!fullMethod.includes(".")){
            fullMethod = "item." + fullMethod;
        }
        let call = "";
        if (fullMethod.includes("(")){
            call = fullMethod.slice(fullMethod.indexOf("(")+1, fullMethod.length-1);
        }
        let [part, method] = fullMethod.split(".");

        if (nowInZone && !zone.contents.includes(this)){
            zone.contents.push(this);
        }else if (!nowInZone && zone.contents.includes(this)){
            zone.contents = zone.contents.filter(c=>c !== this);
        }
        const i = ((part === "item")?this:zone)
        const f = i[method].bind(i);
        if (call){
            // do a scoped safe eval of f using the call string like
            eval("f("+call+")");
        }else{
            f();
        }
    }
    shuffleXZ(config){
        if (!config){config = {}}
        config.includedAxes = ["x", "z"];
        config.ypadding = 0;
        this.shuffleXYZ(config);
    }
    shuffleXYZ(config){
        let {interval, xInterval, yInterval, zInterval, xOffset, yOffset, zOffset, includedAxes, padding, xpadding, ypadding, zpadding} = config || {};
        if (!interval){interval = 1}
        if (!xInterval){xInterval = interval}
        if (!yInterval){yInterval = interval}
        if (!zInterval){zInterval = interval}
        if (!xOffset){xOffset = 0}
        if (!yOffset){yOffset = 0}
        if (!zOffset){zOffset = 0}
        if (!padding){padding = 1}
        if (xpadding === undefined){xpadding = padding}
        if (ypadding === undefined){ypadding = padding}
        if (zpadding === undefined){zpadding = padding}
        ypadding = 0;
        if (!includedAxes){includedAxes = ["x", "y", "z"]}

        // get all x position at interval xInterval and offset by xOffset which fall within the bounding box
        let xPositions = [];
        let yPositions = [];
        let zPositions = [];
        let box = this.getBoundingBox();
        let ximin = Math.floor((box.min.x - xOffset) / xInterval);
        let ximax = Math.floor((box.max.x - xOffset) / xInterval);
        let yimin = Math.floor((box.min.y - yOffset) / yInterval);
        let yimax = Math.floor((box.max.y - yOffset) / yInterval);
        let zimin = Math.floor((box.min.z - zOffset) / zInterval);
        let zimax = Math.floor((box.max.z - zOffset) / zInterval);

        for (let xi = ximin; xi < ximax; xi += 1){
            let x = xi*xInterval + xOffset;
            if (x < (box.min.x + xpadding) || x > (box.max.x - xpadding)){continue}
            xPositions.push(x);
        }
        for (let yi = yimin; yi < yimax; yi += 1){
            let y = yi*yInterval + yOffset;
            if (y < (box.min.y + ypadding) || y > (box.max.y - ypadding)){continue}
            yPositions.push(y);
        }
        for (let zi = zimin; zi < zimax; zi += 1){
            let z = zi*zInterval + zOffset;
            if (z < (box.min.z + zpadding) || z > (box.max.z - zpadding)){continue}
            zPositions.push(z);
        }

        if (!includedAxes.includes("x")){
            xPositions = [Math.min(...xPositions)];
        }
        if (!includedAxes.includes("y")){
            yPositions = [Math.min(...yPositions)];
        }
        if (!includedAxes.includes("z")){
            zPositions = [Math.min(...zPositions)];
        }



        let combinations = [];
        for (let x of xPositions){
            for (let y of yPositions){
                for (let z of zPositions){
                    combinations.push([x, y, z]);
                }
            }
        }

        // shuffle sort the combinations
        combinations.sort((a, b)=>Math.random() - 0.5);
        const box1 = new THREE.Box3().setFromObject(this.shell);
        this.contents = this.contents.filter(c =>{
            return box1.containsPoint(c.position);
        })
        for (let [ind, item] of Object.entries(this.contents)){
            let c = combinations[ind];
            item.cover();
            item.position.set(c[0], c[1], c[2]);
        }
    }
    rotate(rx = 0, ry = 0, rz = 0) {
        this.pivot.rotation.x += rx;
        this.pivot.rotation.y += ry;
        this.pivot.rotation.z += rz;
    }
    onMouseDown(event) {
        this.selected = true;
        let m = this.config.selected.scale;
        this.scale.set(m, m, m);
        if (!this.offset){
            this.offset = true;
            this.model.position.add(this.config.selected.offset);
            this.shell.position.add(this.config.selected.offset);
            this.wireframe.position.add(this.config.selected.offset);
            this.originCube.position.add(this.config.selected.offset);
        }

        this.wireframe.visible = this.config.selected.wireframe;
        this.originCube.visible = this.config.selected.originCube;
    }
    onMouseUp(event) {
        this.selected = false;
        this.scale.set(1, 1, 1);
        if (this.offset) {
            this.offset = false;
            this.model.position.sub(this.config.selected.offset);
            this.shell.position.sub(this.config.selected.offset);
            this.wireframe.position.sub(this.config.selected.offset);
            this.originCube.position.sub(this.config.selected.offset);
        }
        this.wireframe.visible = false;
        this.originCube.visible = false;
        this.checkZones();
    }
    onRightClickDown(event) {
        this.onMouseDown(event);
    }
    onRightClickMove(event) {

    }
    onRightClickUp(event) {
        this.onMouseUp(event);

    }
    select(color){
        this.selected = true;
        if (color !== undefined){
            this.wireframe.material.color.set(color);
        }
        this.wireframe.visible = true;
    }
    unselect(){
        this.selected = false;
        this.wireframe.visible = false;
        this.wireframe.material.color.set(this.config.wireframe.color);
        this.checkZones();
    }
}


