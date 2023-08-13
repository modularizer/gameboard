import * as THREE from 'three';;
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { SnapController } from 'gameengine';
import { DeferredPromise } from 'utils';


export class BaseModel extends THREE.Group {
    constructor(loadPromise) {
        super();
        this.truePivot = new THREE.Object3D();
        this.pivot = this.truePivot;
        this.pivot.position.copy(this.position);

        this.castShadow = this.config.castShadow;
        this.receiveShadow = this.config.receiveShadow;


        this.loadPromise = loadPromise;
        this.loaded = false;

        this.wireframe = null;
        this.originCube = null;

        // make a simple cube that we will replace with the model when it loads
        this.cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
//        this.add(this.cube);
        this.truePivot.add(this.cube);



        this.loadPromise.then(((model) => {
            if (typeof model === "object" && model.config && model.model) {
                console.warn("loading model from cache", model)
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
                this.truePivot.add(this.wireframe);
                this.truePivot.add(this.originCube);

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
                this.truePivot.add(this.wireframe);
                this.truePivot.add(this.originCube);

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
        }
    }
    keyupListeners = {


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
//        console.warn(args);
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
            this.snapController.snap();
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
    addWireframe() {
        let boundingBox = this.getBoundingBox(); // Assume this method returns a THREE.Box3
        let boxGeometry = new THREE.BoxGeometry(
            boundingBox.max.x - boundingBox.min.x,
            boundingBox.max.y - boundingBox.min.y,
            boundingBox.max.z - boundingBox.min.z
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
    setPosition(p){
        if (!this.model){
            this.cube.position.set(p.x, p.y, p.z);
            return this.loadPromise.then(() => {this.setPosition(p)})
        };
        this.model.position.set(p.x, p.y, p.z);

    }
    rotate(rx = 0, ry = 0, rz = 0) {
        this.pivot.rotation.x += rx;
        this.pivot.rotation.y += ry;
        this.pivot.rotation.z += rz;
    }
    onMouseDown(event) {
        console.warn("onMouseDown", event)
        let m = this.config.selected.scale;
        this.scale.set(m, m, m);
        if (!this.offset){
            this.offset = true;
            this.model.position.add(this.config.selected.offset);
            this.wireframe.position.add(this.config.selected.offset);
            this.originCube.position.add(this.config.selected.offset);
        }

        this.wireframe.visible = this.config.selected.wireframe;
        this.originCube.visible = this.config.selected.originCube;
    }
    onMouseUp(event) {
        this.scale.set(1, 1, 1);
        if (this.offset) {
            this.offset = false;
            this.model.position.sub(this.config.selected.offset);
            this.wireframe.position.sub(this.config.selected.offset);
            this.originCube.position.sub(this.config.selected.offset);
        }
        this.wireframe.visible = false;
        this.originCube.visible = false;
    }
    onRightClickDown(event) {
        this.onMouseDown(event);
    }
    onRightClickMove(event) {

    }
    onRightClickUp(event) {
        this.onMouseUp(event);

    }
}


