import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MoveableItem } from 'gameengine';
import { KeyListeners, MouseListeners } from 'utils';
import { DeferredPromise } from 'utils';


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


        this.configure(this.config, cameraPosition, lookAt);


        super.add(this.gridHelper);
        super.add(this.axesHelper);

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

        window.addEventListener('load', ()=>{
           this.display(document.body);
           this.sceneLoaded = true;
        })
    }

    // key listeners
    keyListeners = new KeyListeners({
        "Ctrl+ArrowUp": ()=>{this.item.rotateX(this.config.speed)},
        "Ctrl+ArrowDown": ()=>{this.item.rotateX(-this.config.speed)},
        "Ctrl+ArrowLeft": ()=>{this.item.rotateY(this.config.speed)},
        "Ctrl+ArrowRight": ()=>{this.item.rotateY(-this.config.speed)},
        "ArrowUp": ()=>{this.camera.position.y += this.config.speed},
        "ArrowDown": ()=>{this.camera.position.y -= this.config.speed},
        "ArrowLeft": ()=>{this.camera.position.x -= this.config.speed},
        "ArrowRight": ()=>{this.camera.position.x += this.config.speed},
        " ": ()=>{
            if (!this.state.dragging) {
                this.state.animate = !this.state.animate; // Toggle rotation
            }
        },
        "r": ()=>{this.reset()},
        "p": ()=>{this.state.moveMode = "y"},
        "n": ()=>{this.state.moveMode = "normal"},
        "Control": ()=>{this.state.clickMode = "right"},
        "Alt": ()=>{this.state.clickMode = "middle"},
    },{
        "Control": ()=>{this.state.clickMode = "left"},
        "Alt": ()=>{this.state.clickMode = "left"},
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
        speed: 0.1,
        grid: {
            size: 10,
            divisions: 10,
            show: true,
        },
        axes: {
            size: 5,
            show: true,
        },
        clickSelect: "jump", // false, true, "jump"
    }
    get config() {
        return this._config;
    }
    set config(value) {
        this._config = value;
        this.configure(this._config);
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
            if (spec.enabled == false) continue;
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
            if (this.lights[lightName] && this.lights[lightName].parent) this.remove(this.lights[lightName]);
            this.lights[lightName] = light;
            super.add(light);
        }
    }

    state = {
        dragging: false,
        animate: true,
        items: [],
        selectedItem: null,
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
    }
    addItem(item, position){
        if (item.loadPromise) {
            if (!item.loaded){
                if (this.loaded){
                    this.loaded = false;
                    this.loadDeferredPromise = new DeferredPromise();
                    this.loadPromise = this.loadDeferredPromise.promise;
                }
                item.loadPromise.then(this.checkIfFullyLoaded.bind(this));
            }else{
                this.checkIfFullyLoaded();
            }
        }
        if (item.addToScene) {return item.addToScene(this)};
        item = new MoveableItem(item);
        if (position) item.position.set(position.x, position.y, position.z);
        this.state.items.push(item);
        this.item = item;
        this.add(item);
    }
    reset(){
        this.state.items.map(item => item.reset());
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
        if (intersects.length){
            o = intersects[0].object;
            this.state.selectedFace = intersects[0].face;
            p = intersects[0].point;

            while (!items.includes(o)){
                o = o.parent;
            }
            o = o.parent.parent;
            if (!this.state.items.includes(o)){
                console.error("clicked object not in items", o);
            }
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
            console.warn("clicked item", event.button, this.state.clickMode);
            this.controls.enabled = false;


            this.state.selectedItem = item;
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
        if (!this.state.releaseItem){return}
        if (!touch && this.config.clickSelect === "jump"){
//            this.onMouseMove(event, button, true);
            this.onMouseMove(event, button, true)
        };
        let item = this.state.selectedItem;
        if (item) {
            this.state.selectedItem = null;
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

        let sensitivity = 19;
        let angle = sensitivity * Math.sqrt(diffX * diffX + diffY * diffY);

        let quaternion = new THREE.Quaternion().setFromAxisAngle(rotationAxis, angle);

        let finalQuaternion = new THREE.Quaternion().multiplyQuaternions(item.pivot.originalQuaternion, quaternion);
        item.pivot.setRotationFromQuaternion(finalQuaternion);
    }
    itemRotateEnd(item){
        if (item.snap){
            item.snap();
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
            item.position.add(diff);
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

        }
    }

}


