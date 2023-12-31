import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MoveableItem } from './moveable.js';
import { KeyListeners } from './utils/keyListeners.js';
import { MouseListeners } from './utils/mouseListeners.js';
import { DeferredPromise } from './utils/deferredPromise.js';
import { merge } from './utils/merge.js';


function toXYZ(v) {
    if (v instanceof THREE.Vector3) return [v.x, v.y, v.z];
    if (v instanceof Array) return { x: v[0], y: v[1], z: v[2] };
    if (typeof v === "object") return v;
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}



export class CustomScene extends THREE.Scene {
    constructor(cameraPosition, lookAt) {
        super();
        this.loaded = false;
        this.loadDeferredPromise = new DeferredPromise();
        this.loadPromise = this.loadDeferredPromise.promise;
        this.sceneLoaded = false;

        this.display = this.display.bind(this);
        this.animate = this.animate.bind(this);
        this.getClickedItem = this.getClickedItem.bind(this);
        this.setCameraMode = this.setCameraMode.bind(this);
        this.configure = this.configure.bind(this);
        this.configCamera = this.configCamera.bind(this);
        this.configRenderer = this.configRenderer.bind(this);
        this.configAxesHelper = this.configAxesHelper.bind(this);
        this.configGridHelper = this.configGridHelper.bind(this);
        this.configFloor = this.configFloor.bind(this);
        this.configLights = this.configLights.bind(this);
        this.sendItemUpdate = this.sendItemUpdate.bind(this);
        this.receiveItemUpdate = this.receiveItemUpdate.bind(this);
        this.log = this.log.bind(this);
        this.onlog = this.onlog.bind(this);
        this.cacheFullState = this.cacheFullState.bind(this);
        this.getFullState = this.getFullState.bind(this);
        this.loadCachedState = this.loadCachedState.bind(this);

        this.fullState = {};

        // Event listener for arrow keys
        this.keyListeners.addTo(window);
        this.mouseListeners = new MouseListeners(this);
        this.mouseListeners.addTo(window);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector3(0, 0, 0.5);
        this.offset = new THREE.Vector3();
        this.renderer = new THREE.WebGLRenderer();
        this.gridHelper = new THREE.GridHelper();
        this.axesHelper = new THREE.AxesHelper();
        this.zones = [];


        this.configure(this.config, cameraPosition, lookAt);


//        super.add(this.gridHelper);
//        super.add(this.axesHelper);

        let d = {
            "camera": this.configCamera,
            "renderer": this.configRenderer,
            "axes": this.configAxesHelper,
            "grid": this.configGridHelper,
            "floor": this.configFloor,
            "lights": this.configLights,
        };
        this._config = new Proxy(this.config, {
            get: (target, key) => {
                let value = target[key];
                if (typeof value === "object") {
                    return new Proxy(target[key], {
                        get: (target2, key2) => {
                            let value2 = target2[key2];
                            if (typeof value2 === "object"){
                                return new Proxy(value2, {
                                    get: (target3, key3)=>target3[key3],
                                    set: (target3, key3, value3)=>{
                                        target3[key3] = value3;
                                        d[key](target2);
                                        return true;
                                    }
                                })
                            }
                            return value2;
                        },
                        set: (target2, key2, value2) => {
                            target2[key2] = value2;
                            d[key](target2);
                            return true;
                        }
                    })
                }
                return value;
            },
            set: (target, key, value) => {
                d[key](value);
                return true;
            }
        })
        this.freshState = {};

        this.loadPromise.then(this.loadCachedState.bind(this));

        this.loadPromise.then(()=>{console.timeEnd("load")});

//        window.addEventListener('load', ()=>{
//           this.display(document.body);
//           this.sceneLoaded = true;
//        })
    }

    // key listeners
    keyListeners = new KeyListeners({
        "ArrowUp": ()=>{
            if (this.state.selectedItem){
                this.state.selectedItem.position.z -= this.config.speed;
            }else{
                this.camera.position.x += this.config.speed
            }
        },
        "ArrowDown": ()=>{
            if (this.state.selectedItem){
                this.state.selectedItem.position.z += this.config.speed;
            }else{
                this.camera.position.x -= this.config.speed
            }
        },
        "ArrowLeft": ()=>{
            if (this.state.selectedItem){
                this.state.selectedItem.position.x -= this.config.speed;
            }else{
                this.camera.position.y -= this.config.speed
            }
        },
        "ArrowRight": ()=>{
            if (this.state.selectedItem){
                this.state.selectedItem.position.x += this.config.speed;
            }else{
                this.camera.position.y += this.config.speed
            }
        },
        "Control+r": ()=>{
            if (!this.state.dragging) {
                this.state.animate = !this.state.animate; // Toggle rotation
            }
            if (this.state.selectedItem) {
                let item = this.state.selectedItem;
                this.state.selectedItem.pivot.rotateY(Math.PI/2);
                this.itemRotateEnd(item);
                if (item.onRightClickUp) item.onRightClickUp(event);
            }
        },
        "Control+x": ()=>{this.reset()},
        "Control+p": ()=>{this.state.moveMode = "y"},
        "Control+n": ()=>{this.state.moveMode = "normal"},
        "Control": ()=>{this.state.clickMode = "right"},
        "Alt": ()=>{this.state.clickMode = "middle"},
        "default": (e, k)=>{
            console.warn("Unhandled key:", k);
            if (this.state.selectedItem) {
                console.log("selectedItem", this.state.selectedItem)
               this.state.selectedItem.keydown(e, k)
            }
        },
    },{
        "Control": ()=>{this.state.clickMode = "left"},
        "Alt": ()=>{this.state.clickMode = "left"},
        "default": (e, k)=>{if (this.state.selectedItem) this.state.selectedItem.keyup(e, k)},
        "ArrowUp": (event)=>{
            if (this.state.selectedItem) {
                this.state.releaseItem = true;
                this.onMouseUp(event, 0, false)
            }
        },
        "ArrowDown": (event)=>{
            if (this.state.selectedItem) {
                this.state.releaseItem = true;
                this.onMouseUp(event, 0, false)
            }
        },
        "ArrowLeft": (event)=>{
            if (this.state.selectedItem) {
                this.state.releaseItem = true;
                this.onMouseUp(event, 0, false)
            }
        },
        "ArrowRight": (event)=>{
            if (this.state.selectedItem) {
                this.state.releaseItem = true;
                this.onMouseUp(event, 0, false)
            }
        }

    });


    _config = {
        camera: {
            mode: "perspective",
            orthographic: {
                left: -10,
                right: 10,
                top: 16,
                bottom: -4,
            },
            perspective: {
                fov: 50,
                aspect: window.innerWidth / window.innerHeight,
                near: 0.1,
                far: 1000,
            },
            minAngle: 0,
//            maxAngle: 180,
            maxAngle: 70,
            position: {
                x: 10,
                y: 10,
                z: 10,
            }
        },
        lights: {
            ambient: {
                enabled: true,
                color: 0xffffff,
                intensity: 0.5,
                type: "ambient",
            },
            directional: {
                enabled: false,
                color: 0xff00ff,
                intensity: 0.9,
                type: "directional",
                position: {
                    x: 10,
                    y: 10,
                    z: 10,
                },
                target: {
                    x: 0,
                    y: 0,
                    z: 0,
                },
                castShadow: window.shadows,
            },
            point: {
                enabled: true,
                color: 0xffffff,
                intensity: 1,
                distance: 0,
                decay: 1,
                type: "point",
                position: {
                    x: 10,
                    y: 10,
                    z: 10,
                },
                castShadow: window.shadows,
            }
        },
        renderer: {
            clearColor: 0xffffff,
            clearAlpha: 0,
            size: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
            shadows: window.shadows,

        },
        floor: {
            show: true,
            width: 100,
            height: 100,
            y: -0.05,
            color: 0xcccccc,
        },
        speed: 0.5,
        grid: {
            size: 10,
            divisions: 10,
            show: true,
        },
        axes: {
            size: 5,
            show: true,
        },
        clickSelect: "jump", //"jump", // false, true, "jump"
    }
    get config() {
        return this._config;
    }
    set config(value) {
        this._config = value;
        this.configure(this._config);
    }
    updateConfig(value) {
        let o = merge(this.config, value);
        this.configure(o, o.camera.position, o.camera.lookAt?o.camera.lookAt:{x:0,y:0,z:0});
    }
    configure(config, cameraPosition, lookAt) {
        // Set up camera
        this.configCamera(this.config.camera, cameraPosition, lookAt);
        this.configRenderer(this.config.renderer);
        this.configAxesHelper(this.config.axes);
        this.configGridHelper(this.config.grid);
        this.configFloor(this.config.floor);
        this.configLights(this.config.lights);
    }

    configRenderer(config){
        this.renderer.setSize(config.size.width, config.size.height);
        this.renderer.setClearColor(config.clearColor, config.clearAlpha);
        this.renderer.shadowMap.enabled = config.shadows;
    }
    configCamera(config, cameraPosition, lookAt){
        this.perspectiveCamera = new THREE.PerspectiveCamera(
            config.perspective.fov,
            config.perspective.aspect,
            config.perspective.near,
            config.perspective.far,
        );
        let aspect = window.innerWidth / window.innerHeight;
        this.orthographicCamera = new THREE.OrthographicCamera(
            config.orthographic.left * aspect,
            config.orthographic.right * aspect,
            config.orthographic.top,
            config.orthographic.bottom
        );

        if (cameraPosition) {
            cameraPosition = toXYZ(cameraPosition);
        }else if (this.camera){
            cameraPosition = this.camera.position.clone();
        }
        if ((!lookAt) && this.controls && this.controls.target){
            lookAt = this.controls.target.clone();
        }

        if (this.camera && this.camera.parent) this.remove(this.camera);
        this.camera = (config.mode === "perspective")?this.perspectiveCamera:this.orthographicCamera;
        if (cameraPosition) this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
        this.add(this.camera);

        this.addOrbitControls();

        if (lookAt){
            this.controls.target.copy(lookAt);
            this.camera.lookAt(this.controls.target);
        }
    }
    addOrbitControls(){
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.minPolarAngle = (this.config.camera.minAngle * Math.PI / 180); // radians
        this.controls.maxPolarAngle = (this.config.camera.maxAngle * Math.PI / 180); // radians
        for (let [k, v] of Object.entries(this.orbitListeners)){
            this.controls.addEventListener(k, v.bind(this));
        }
    }
    orbitListeners = {
        "start": ()=>{this.state.animate = false; this.state.dragging = true},
        "end": ()=>{this.state.animate = true; this.state.dragging = false},
    }
    setCameraMode(mode){
        this.config.camera.mode = mode;
        this.configCamera(this.config.camera);
    }
    configAxesHelper(config){
        this.axesHelper.size = config.size;
    }
    configGridHelper(config){
        this.gridHelper.visible = config.show;
        this.gridHelper.size = config.size;
        this.gridHelper.divisions = config.divisions;
    }
    configFloor(config){
        // Create a geometry
        let floorGeometry = new THREE.PlaneGeometry(config.width, config.height, 1, 1);

        // Rotate it so it's parallel to the xz plane
        floorGeometry.rotateX(-Math.PI / 2);
        // set the y position to -0.1
        floorGeometry.translate(0, config.y, 0);

        // Create a material
        let floorMaterial = new THREE.MeshStandardMaterial({ color: config.color }); // gray color


        // Create a mesh and add it to the scene
        if (this.floor && this.floor.parent) this.remove(this.floor);
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.receiveShadow = true;
        this.floor.visible = config.show;
        super.add(this.floor);
    }
    configLights(config){
        if (!this.lights){this.lights = {};}

        for (let [lightName, spec] of Object.entries(config)){
            let light = null;
            if (spec.type == "ambient"){
                light = new THREE.AmbientLight(spec.color, spec.intensity);
            }else if (spec.type == "directional"){
                light = new THREE.DirectionalLight(spec.color, spec.intensity);
                light.position.set(spec.position.x, spec.position.y, spec.position.z);
                light.target.position.set(spec.target.x, spec.target.y, spec.target.z);
                light.castShadow = spec.castShadow;
            }else if (spec.type == "point"){
                light = new THREE.PointLight(spec.color, spec.intensity, spec.distance, spec.decay);
                light.position.set(spec.position.x, spec.position.y, spec.position.z);
                light.castShadow = spec.castShadow;
            }
            light.visible = spec.enabled;
            if (this.lights[lightName] && this.lights[lightName].parent) this.remove(this.lights[lightName]);
            this.lights[lightName] = light;
            super.add(light);
        }
    }

    state = {
        dragging: false,
        animate: true,
        items: [],
        itemsByName: {},
        selectedItem: null,
        peerSelections: {},
        otherSelectedItems: {},
        selectedFace: null,
        releaseItem: true,
        moveMode: "normal", // "normal", "x", "y", "z", Vector3
        mouseState: null,
    }
    checkIfFullyLoaded(){

        if (!this.loaded){
            if (this.state.items.every(item => item.loaded)){
                this.loaded = true;
                this.loadDeferredPromise.resolve(this);
            }
        }
    }

    display(parentElement) {
        parentElement.appendChild(this.renderer.domElement);
        this.animate();
        this.sceneLoaded = true;
    }
    add(item){

        super.add(item);
        if (item.dropzone || item.movezone){
            this.addZone(item);
        }
    }
    addZone(item){
        this.zones.push(item);
    }
    addModel(item, position, rotation){
        if (item.loadPromise) {
            if (!item.loaded){
                if (this.loaded){
                    this.loaded = false;
                    this.loadDeferredPromise = new DeferredPromise();
                    this.loadPromise = this.loadDeferredPromise.promise;
                    this.loadPromise.then(this.loadCachedState.bind(this));
                    this.loadPromise.then(()=>{console.timeEnd("load")});
                }
                item.loadPromise.then(this.checkIfFullyLoaded.bind(this));
                item.loadPromise.then(()=>{this.addModel.bind(this)(item)});
                this.state.itemsByName[item.name] = item;
                return
            }else{
                this.checkIfFullyLoaded();
            }
        }
        if (item.addToScene) {return item.addToScene(this)};
        item = new MoveableItem(item, position, rotation);
        this.state.items.push(item);
        this.item = item;
        this.add(item);
    }
    reset(){
        this.log("reset room");
        localStorage.setItem(location.hash + "FullState", JSON.stringify(this.freshState));
        this.loadCachedState();
        this.sendItemUpdate(this.freshState);


        localStorage.removeItem(location.hash + "FullState");
        this.sendItemUpdate("reset");
        location.reload();
    }
    animate(t) {
        requestAnimationFrame(this.animate.bind(this));
        if (this.state.animate){
            this.state.items.forEach(item => {
                item.moveFrame(t);
            })
        }
        if (this.controls.enabled) this.controls.update();  // update OrbitControls
        this.renderer.render(this, this.camera);
    }

    showRay(dir, origin, color=0x00ff00, length=10, name="rayHelper"){
        let arrowHelper = new THREE.ArrowHelper(dir, origin, length, color);
        this.remove(this.getObjectByName(name));
        arrowHelper.name = name;
        super.add(arrowHelper);
    }
    intersectMovePlane(item){
        let planeNormal;
        let mm = this.state.moveMode;
        if (mm === "normal") {
            planeNormal = this.camera.getWorldDirection(new THREE.Vector3()).negate();
        } else if (mm === "x") {
            planeNormal = new THREE.Vector3(1, 0, 0);
        } else if (mm === "y") {
            planeNormal = new THREE.Vector3(0, 1, 0);
        } else if (mm === "z") {
            planeNormal = new THREE.Vector3(0, 0, 1);
        } else if (mm instanceof THREE.Vector3) {
            planeNormal = mm;
        } else if (mm instanceof Array) {
            planeNormal = new THREE.Vector3(...mm);
        } else {
            planeNormal = new THREE.Vector3(mm.x, mm.y, mm.z);
        }
        let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, item.position);
        let mouse3D = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera);
        this.raycaster.set(this.camera.position, mouse3D.sub(this.camera.position).normalize());
        this.raycaster.ray.intersectPlane(plane, this.mouse);
    }
    getClickedItem(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera( this.mouse, this.camera );

        // this.showRay();

        // Calculate objects intersecting the picking ray
        let items = this.state.items.map(item => item.model).filter(v=>v)
        let intersects = this.raycaster.intersectObjects( items, true);

        // keep the same object selected as it passes behind other objects
        if (this.state.selectedFace){
            for (let i of intersects){
                if (i.face == this.state.selectedFace){
                    return this.state.selectedItem
                }
            }
        }

        let o;
        let p;
        let possibleItems = [];
        if (intersects.length){
            for (let intersect of intersects){
                o = intersect.object;
                while (!items.includes(o)){
                    o = o.parent;
                }
                o = o.parent.parent;
                possibleItems.push([intersect, o])
            }
            let nonzoneItems = possibleItems.filter(([intersect, o])=>{
                return !this.zones.includes(o)
            });
            if (nonzoneItems.length){
                possibleItems = nonzoneItems;
            }


            // select first one initially and get its position
            let p = possibleItems[0][1].position;
            possibleItems = possibleItems.filter(([intersect, o])=>o.position.equals(p));

            // now randomly select one of the items that are in the same position
            let i = Math.floor(Math.random() * possibleItems.length);
            console.log("possibleItems",i,  possibleItems.length)
            o = possibleItems[i][1];

            this.state.selectedFace = possibleItems[i][0].face;
            p = possibleItems[i][0].point;
            o.clickPoint = o.worldToLocal(p);
        }else{
            o = null;
        }
        return o
    }
    onMouseDown(event, button, touch) {
        if (!touch && this.config.clickSelect){
            if (this.state.selectedItem){
                this.state.releaseItem = true;
                this.state.dragging = true;
                return
            }else{
                this.state.releaseItem = false;
            }
        }
        let item = this.getClickedItem(event);
        if (item){
            this.controls.enabled = false;


            this.state.selectedItem = item;
            this.sendItemUpdate({"selected": item.name, nocache: true});
            this.state.dragging = true;

            this.state.mouseState = {
                original: {x: this.mouse.x, y: this.mouse.y},
                firstMove: true,
                offset: new THREE.Vector3().copy(item.position).sub(this.mouse),
                jumpOffset: new THREE.Vector3(),
            };

            if (button === 2) {
                this.itemRotateClick(item);
                if (item.onRightClickDown) item.onRightClickDown(event);
            }else if (button === 1) {
                if (item.onMiddleClickDown) item.onMiddleClickDown(event);
            }else{
                this.itemDragClick(item);
                if (item.onMouseDown) item.onMouseDown(event);
            }
        } else {
            this.state.dragging = false;
            this.state.selectedItem = null;
            this.sendItemUpdate({"selected": null, nocache: true});
            this.state.selectedFace = null;
            this.controls.enabled = true;
        }
    }
    onMouseMove(event, button, force=false) {
        if (!this.state.dragging){return}
        this.getClickedItem(event);
        let item = this.state.selectedItem;
        if (item) {
            // if right click, call context menu
            if (button === 2) {
                this.itemRotateMove(item);
                if (item.onRightClickMove) item.onRightClickMove(event);
            }else if (button === 1) {
                if (item.onMiddleClickMove) item.onMiddleClickMove(event);
            }else{
                if (event.buttons === 1){
                    force = true;
                    this.state.releaseItem = true;
                }
                this.itemDragMove(item, force);
                if (item.onMouseMove) item.onMouseMove(event);
            }
        }
    }
    onMouseUp(event, button, touch) {
        if (!button){
            if (!this.state.releaseItem){return}
            if (!touch && this.config.clickSelect === "jump"){
                this.onMouseMove(event, button, true)
            };
        }
        let item = this.state.selectedItem;
        if (item) {
            this.state.selectedItem = null;
            this.sendItemUpdate({"unselected": item.name, nocache: true});
            this.state.selectedFace = null;
            this.state.dragging = false;
            this.addOrbitControls();

            // if right click, call context menu
            if (button === 2) {
                this.itemRotateEnd(item);
                if (item.onRightClickUp) item.onRightClickUp(event);
            }else if (button === 1) {
                if (item.onMiddleClickUp) item.onMiddleClickUp(event);
            }else{
                this.itemDragEnd(item);
                if (item.onMouseUp) item.onMouseUp(event);
            }
            if (item.snap){
                item.snap();
                this.sendItemUpdate({[item.name]: {rotation: item.pivot.rotation.toArray(), position: item.position.toArray()}})
            }
        }
    }
    onDblClick(event) {
        let item = this.getClickedItem(event);

        if (item) {
            // match rot{axis}{deg}, e.g. rotX90, rotY180, rotZ270 or flip{axis}, e.g. flipX, flipY, flipZ or rotate{axis}{deg}, e.g. rotateX90, rotateY180, rotateZ270
            // make axis and deg both optional, e.g. rot, flip, rotate followed by optional axis and deg
            let s = item.dblclick;

            let [mode, axis, deg] = s.match(/^(flip|rot|rotate)?([xyz])?(\d+)?$/i).slice(1);
            mode = mode || "rot";
            if (mode === "rot"){mode="rotate"}
            if (mode === "flip"){
                deg = 180;
                axis = axis || "x";
            }else{
                deg = (deg !== undefined)?parseInt(deg):90;
                axis = axis || "y";
            }
            axis = axis.toLowerCase();
            item.pivot.rotation[axis] += (deg * Math.PI / 180);
            this.sendItemUpdate({[item.name]: {rotation: item.pivot.rotation.toArray()}})
        }
    }
    itemRotateClick(item){
        // Save the original mouse position and the original quaternion
        item.pivot.originalQuaternion = item.pivot.quaternion.clone();
    }
    itemRotateMove(item){
        let diffX = this.mouse.x - this.state.mouseState.original.x;
        let diffY = -(this.mouse.y - this.state.mouseState.original.y);

        let rotationAxis = new THREE.Vector3(diffY, diffX, 0).normalize();

        let sensitivity = 20;
        let angle = sensitivity * Math.sqrt(diffX * diffX + diffY * diffY);

        let quaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle);

        let finalQuaternion = new THREE.Quaternion().multiplyQuaternions(item.pivot.originalQuaternion, quaternion);
        let euler = new THREE.Euler();
        euler.setFromQuaternion(finalQuaternion);
        if (item.snapController){
            euler = item.snapController.enforceRotationLocks(euler);
        }
        this.sendItemUpdate({[item.name]: {rotation: euler.toArray()}, nocache: true});
        item.pivot.rotation.set(euler.x, euler.y, euler.z);
    }
    itemRotateEnd(item){
        if (item.snap){
            item.snap();
            this.sendItemUpdate({[item.name]: {rotation: item.pivot.rotation.toArray()}, nocache: true});
        }
        this.state.startPosition = null;
    }
    itemDragClick(item){
        // if left click, move the object
        this.intersectMovePlane(item);
        item.startDragPosition = item.position.clone();
    }
    itemDragMove(item, force=false){
        // if left click, move the object
        this.intersectMovePlane(item);
        let endPos = item.position.clone().copy(this.mouse).sub(this.state.mouseState.offset);
        endPos.y = Math.max(0, endPos.y);

        if (!this.state.mouseState.firstMove) {
            let diff = endPos.clone().sub(item.position).sub(this.state.mouseState.jumpOffset);
            if (!force && this.config.clickSelect === "jump"){return}
            endPos = item.position.clone().add(diff);
            if (item.snapController){
                endPos = item.snapController.enforcePositionLocks(endPos);
            }

            this.sendItemUpdate({[item.name]: {position: endPos.toArray()}, nocache: true});
            item.setPosition(endPos);
        } else {
            this.state.mouseState.jumpOffset = endPos.clone().sub(item.position);
            this.state.mouseState.firstMove = false;
        }
    }
    itemDragEnd(item){
        if (item.snap){
            try{
                item.snap();

            }catch{
                item.position.copy(item.startDragPosition);
            }
            this.sendItemUpdate({[item.name]: {position: item.position.toArray()}, nocache: true});
        }
    }

    attachMQTTRTC(m){
        this.m = m;
        this.m.handlers["moves"] = this.receiveItemUpdate.bind(this);
        this.syncedFrom = [];
        this.syncedTo = [];
        this.m.handlers["sync"] = this.sync.bind(this);
        console.log("requesting sync")
        this.syncInterval = setInterval((() => {
            this.m.send("request", "sync")
        }).bind(this), 1000); // tries to sync every second until it is successfully gets a sync response
        setTimeout((()=>this.m.send("request", "sync")).bind(this), 100);

        // FIXME: this asks everyone, should be a better way
        // also use promise not timeout
    }
    getFullState(){
        let data = {};
        for (let [name, item] of Object.entries(this.state.itemsByName)){
            data[name] = {position: item.position.toArray(), rotation: item.pivot.rotation.toArray()}
        }
        return data;
    }
    cacheFullState(){
        this.fullState = this.getFullState()
        localStorage.setItem(location.hash + "FullState", JSON.stringify(this.fullState));
    }
    checkZones(){
        if (!this.loaded){
            return this.loadPromise.then(this.checkZones.bind(this));
        }

        this.state.items.map(item => {
            item.zones = this.zones;
        })
        const zoneBoxes = this.zones.map(zone => new THREE.Box3().setFromObject(zone.shell));
        const inZones = [];



        this.state.items.map((item, i) => {
            const zones = this.zones.filter((zone, j) => zoneBoxes[j].containsPoint(item.position));
            inZones.push([item, zones]);
            for (let zone of zones) {
                if (!zone.contents.includes(item)) {
                    zone.contents.push(item);
                }
            }
        })

        for (let [item, zones] of inZones){
            for (let zone of zones){
                item.setZone(zone, "dropzone", true);
                item.setZone(zone, "movezone", true);
            }
        }


    }
    loadCachedState(){
        if (this.syncedFrom.length){
            this.cacheFullState();
//            setTimeout(this.checkZones.bind(this), 1000);
            return
        }
        this.log("loading from browser cache")
        let data = JSON.parse(localStorage.getItem(location.hash + "FullState") || "false");
        if (!data){return}
        for (let [name, update] of Object.entries(data)){
            let item = this.state.itemsByName[name];
            if (!item){continue}
            if (update.position){
                item.setPosition(...update.position);
            }
            if (update.rotation){
                item.pivot.rotation.set(...update.rotation);
            }
            item.snap();
        }
//        setTimeout(this.checkZones.bind(this), 1000);

    }
    sync(data, sender){
        if (data === "request"){
            if (!this.syncedFrom){return}
            let data = this.getFullState();

            this.m.send(data, "sync", sender);
            this.syncedTo.push(sender);
            this.log(`Syncing to ${sender}`)
        }else{
            this.log(`Syncing from ${sender}`);
            this.receiveItemUpdate(data, sender, true);
            setTimeout(this.checkZones.bind(this), 1000);
            this.syncedFrom.push(sender);
            if (this.syncInterval){
                clearInterval(this.syncInterval);
                this.syncInterval = null;
            }
        }
    }
    sendItemUpdate(data){
        this.m.send(data, "moves");

        if (!data.nocache){

            let changed = false;
            for (let [name, update] of Object.entries(data)){
            if (!["selected", "unselected"].includes(name)){
                if (!this.fullState[name]){
                    this.fullState[name] = {"position": null, "rotation": null}
                }

                changed = true;
                if (update.position){
                    this.log('You moved');
                    this.fullState[name].position = update.position;
                }
                if (update.rotation ){
                    if (!update.position) this.log(`You rotated ${name}`);
                    this.fullState[name].rotation = update.rotation;
                }
            }
            if (changed){
                localStorage.setItem(location.hash + "FullState", JSON.stringify(this.fullState));
            }
        }
        }
    }
    receiveItemUpdate(data, sender, forcenocache=false){
        if (data === "reset"){
            localStorage.removeItem(location.hash + "FullState");
            location.reload();
        }
        let cache = !(forcenocache || data.nocache);
        delete data.nocache;
        for (let [name, update] of Object.entries(data)){
            if (name === "selected"){
                if (update){
                    if (!this.state.otherSelectedItems[update]){
                        this.state.otherSelectedItems[update] = [];
                    }
                    this.state.otherSelectedItems[update].push(sender);
                    this.state.itemsByName[update].select(0xff0000);
                    this.state.peerSelections[sender] = update;
                }else{
                    update = this.state.peerSelections[sender];
                    let selectors = this.state.otherSelectedItems[update]
                    if (selectors){
                        this.state.otherSelectedItems[update] = selectors.filter((s)=>s!==sender);
                    }
                    if (this.state.otherSelectedItems[update] && !this.state.otherSelectedItems[update].length){
                        this.state.itemsByName[update].unselect();
                    }
                }
            }else if (name === "unselected"){
                let selectors = this.state.otherSelectedItems[update]
                if (selectors){
                    this.state.otherSelectedItems[update] = selectors.filter((s)=>s!==sender);
                }
                if (this.state.otherSelectedItems[update] && !this.state.otherSelectedItems[update].length){
                    this.state.itemsByName[update].unselect();
                }
            }
            else{
                let item = this.state.itemsByName[name];
                if (!item){continue}
                if (update.position){
                    if (cache) this.log(`${sender} moved`);
                    item.setPosition(...update.position);
                }
                if (update.rotation){
                    if (cache && !update.position) this.log(`${sender} rotated ${name}`);
                    if (item.config && (item.config.coverMode === "flip")){
                        update.rotation[0] = item.covered?Math.PI:0;
                    }
                    item.pivot.rotation.set(...update.rotation);
                }
            }
        }

        this.cacheFullState();
    }
    log(msg){
        console.log(msg);
        this.onlog(msg);
    }
    onlog(msg){
    //gets overridden
    }

}


