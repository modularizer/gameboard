import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MoveableItem } from 'gameengine';


function toXYZ(v) {
    if (v instanceof THREE.Vector3) return [v.x, v.y, v.z];
    if (v instanceof Array) return { x: v[0], y: v[1], z: v[2] };
    if (typeof v === "object") return v;
}

export class CustomScene extends THREE.Scene {
    constructor(cameraPosition, lookAt) {
        super();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector3(0, 0, 0.5);
        this.offset = new THREE.Vector3();

        if (cameraPosition) this.state.camera.position = toXYZ(cameraPosition);

        // Set up camera
        this.addCamera();
        if (lookAt) this.lookAt(lookAt);

        // Set up renderer
        this.addRenderer();

        // OrbitControls for panning, zooming, and rotating
        this.addOrbitControls();

        // Event listener for arrow keys
        this.addKeyListeners();

        this.display = this.display.bind(this);
        this.animate = this.animate.bind(this);
        this.getClickedItem = this.getClickedItem.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);

        this.setCameraMode = this.setCameraMode.bind(this);


        // Add axes helper
        if (this.config.axes.show) this.addAxesHelper();

        // Add grid helper
        if (this.config.grid.show) this.addGridHelper();

        if (this.config.floor.show) this.addFloor();
        this.addLights();

        this.addMouseListeners();

    }
    config = {
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
                castShadow: true,
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
                castShadow: true,
            }

        },
        renderer: {
            clearColor: 0xffffff,
            clearAlpha: 0,
            size: {
                width: window.innerWidth,
                height: window.innerHeight,
            },
            shadows: true,

        },
        floor: {
            show: true,
            width: 100,
            height: 100,
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
        }
    }
    state = {
        _isDragging: false,
        shouldAnimate: true,
        camera: {
            position: {
                x: 0,
                y: 0,
                z: 5,
            },
        },
        items: [],
        selectedItem: null,
        moveMode: "normal", // "normal", "x", "y", "z", Vector3\
    }
    reset(){
        this.state.items.map(item => item.reset());
    }
    lookAt(x, y, z) {
        super.lookAt(new Vector3(x, y, z));
    }
    addCamera(){
        this.perspectiveCamera = new THREE.PerspectiveCamera(
            this.config.camera.perspective.fov,
            this.config.camera.perspective.aspect,
            this.config.camera.perspective.near,
            this.config.camera.perspective.far,
        );
        let aspect = window.innerWidth / window.innerHeight;
        this.orthographicCamera = new THREE.OrthographicCamera(
            this.config.camera.orthographic.left * aspect,
            this.config.camera.orthographic.right * aspect,
            this.config.camera.orthographic.top,
            this.config.camera.orthographic.bottom
        );
        this.camera = (this.config.camera.mode === "perspective")?this.perspectiveCamera:this.orthographicCamera;
        this.camera.position.x = this.state.camera.position.x;
        this.camera.position.y = this.state.camera.position.y;
        this.camera.position.z = this.state.camera.position.z;
        this.state.camera.position = this.camera.position;
        this.add(this.camera);
    }
    setCameraMode(mode){
        let p = this.camera.position.clone();
        let t = this.controls.target.clone();

        this.remove(this.camera);
        this.config.camera.mode = mode;
        this.camera = (this.config.camera.mode === "perspective")?this.perspectiveCamera:this.orthographicCamera;

        this.camera.position.copy(p);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);  // replace your controls instance
        this.controls.target.copy(t);
        this.camera.lookAt(this.controls.target);
        this.add(this.camera);
    }

    add(item, position, makeMoveable=true){
        if (makeMoveable){
            if (position) item.position.set(position.x, position.y, position.z);
            item = new MoveableItem(item);
            this.state.items.push(item);
            this.item = item;
        }
        super.add(item);
    }
    addRenderer(){
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(this.config.renderer.size.width, this.config.renderer.size.height);
        this.renderer.setClearColor(this.config.renderer.clearColor, this.config.renderer.clearAlpha);
        this.renderer.shadowMap.enabled = this.config.renderer.shadows;
    }
    addGridHelper(){
        this.gridHelper = new THREE.GridHelper(this.config.grid.size, this.config.grid.divisions);
        super.add(this.gridHelper);
    }
    addAxesHelper(){
        this.axesHelper = new THREE.AxesHelper(this.config.axes.size);
        super.add(this.axesHelper);
    }
    addFloor(){
        // Create a geometry
        let floorGeometry = new THREE.PlaneGeometry(this.config.floor.width, this.config.floor.height, 1, 1);

        // Rotate it so it's parallel to the xz plane
        floorGeometry.rotateX(-Math.PI / 2);

        // Create a material
        let floorMaterial = new THREE.MeshStandardMaterial({ color: this.config.floor.color }); // gray color


        // Create a mesh and add it to the scene
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.receiveShadow = true;
        super.add(this.floor);

    }
    addLights(){
        for (let [lightName, spec] of Object.entries(this.config.lights)){
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
            super.add(light);
        }
    }
    addKeyListeners(){
        window.addEventListener('keydown', (e) => {
            let k = e.key;
            if (this.state.selectedItem) {
                // fire keydown event on selected item
                this.state.selectedItem.dispatchEvent({ type: "keydown", key: k });

            }
            if (e.shiftKey) k = "Shift+" + k;
            if (e.altKey) k = "Alt+" + k;
            if (e.ctrlKey) k = "Ctrl+" + k;
            if (e.metaKey) k = "Meta+" + k;
            if (e.fnKey) k = "Fn+" + k;

            if (this.keyListeners[k]) {
                this.keyListeners[k].bind(this)(e);
                e.preventDefault();
                e.stopPropagation();
            }
        })
    }
    addOrbitControls(){
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.minPolarAngle = (this.config.camera.minAngle * Math.PI / 180); // radians
        this.controls.maxPolarAngle = (this.config.camera.maxAngle * Math.PI / 180); // radians
        for (let [k, v] of Object.entries(this.orbitListeners)){
            this.controls.addEventListener(k, v.bind(this));
        }
    }
    keyListeners = {
        "Ctrl+ArrowUp": ()=>{this.item.rotateX(this.config.speed)},
        "Ctrl+ArrowDown": ()=>{this.item.rotateX(-this.config.speed)},
        "Ctrl+ArrowLeft": ()=>{this.item.rotateY(this.config.speed)},
        "Ctrl+ArrowRight": ()=>{this.item.rotateY(-this.config.speed)},
        "ArrowUp": ()=>{this.camera.position.y += this.config.speed},
        "ArrowDown": ()=>{this.camera.position.y -= this.config.speed},
        "ArrowLeft": ()=>{this.camera.position.x -= this.config.speed},
        "ArrowRight": ()=>{this.camera.position.x += this.config.speed},
        " ": ()=>{
            if (!this.state._isDragging) {
                this.state.shouldAnimate = !this.state.shouldAnimate; // Toggle rotation
            }
        },
        "r": ()=>{this.reset()},
        "p": ()=>{this.state.moveMode = "y"},
        "n": ()=>{this.state.moveMode = "normal"},
    }
    orbitListeners = {
        "start": ()=>{this.state.shouldAnimate = false; this.state._isDragging = true},
        "end": ()=>{this.state.shouldAnimate = true; this.state._isDragging = false},
    }

    display(parentElement) {
        parentElement.appendChild(this.renderer.domElement);
        this.animate();
    }
    animate(t) {
        requestAnimationFrame(this.animate.bind(this));
        if (this.state.shouldAnimate){
            this.state.items.forEach(item => {
                item.moveFrame(t);
            })
        }
        if (this.controls.enabled) this.controls.update();  // update OrbitControls
        this.renderer.render(this, this.camera);
    }

    addMouseListeners() {
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
        window.addEventListener('touchstart', this.onTouchStart.bind(this));
        window.addEventListener('touchmove', this.onTouchMove.bind(this));
        window.addEventListener('touchend', this.onTouchEnd.bind(this));
    }
    getClickedItem(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera( this.mouse, this.camera );

        // this.showRay();

        // Calculate objects intersecting the picking ray
        let intersects = this.raycaster.intersectObjects( this.state.items, true);

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

            while (!this.state.items.includes(o)){
                o = o.parent;
            }
        }else{
            o = null;
        }
        return o
    }
    showRay(){
        let dir = this.raycaster.ray.direction;  // normalized direction vector components
        let origin = this.raycaster.ray.origin;  // ray origin coordinates
        let length = 10;  // length of the arrow
        let color = 0xff0000;  // color of the arrow

        let arrowHelper = new THREE.ArrowHelper(dir, origin, length, color);

        // remove the old arrow from the scene if it exists
        this.remove(this.getObjectByName("arrowHelper"));

        // assign name to the arrow object
        arrowHelper.name = "arrowHelper";

        // add the arrow to the scene
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

    onMouseDown(event) {
        let item = this.getClickedItem(event);
        if (item){
            this.intersectMovePlane(item);
            this.offset.copy(item.position).sub(this.mouse);
            this.state.selectedItem = item;
            this.controls.enabled = false;
            this.state._isDragging = true;
            if (item.onMouseDown) item.onMouseDown(event);
        }else{
            this.state.selectedItem = null;
            this.state.selectedFace = null;
            this.controls.enabled = true;
        }
    }
    onMouseMove(event) {
        this.getClickedItem(event);
        let item = this.state.selectedItem;
        if (item) {
            this.intersectMovePlane(item);
            let endPos = item.position.clone().copy(this.mouse).sub(this.offset);
            endPos.y = Math.max(0, endPos.y);
            let diff = endPos.clone().sub(item.position);
            item.position.add(diff);
            if (item.onMouseMove) item.onMouseMove(event);
        }
    }
    onMouseUp(event) {
        let item = this.state.selectedItem;
        if (item) {
            this.state.selectedItem = null;
            this.state.selectedFace = null;
            this.state._isDragging = false;
            this.addOrbitControls();
            if (item.onMouseUp) item.onMouseUp(event);
        }

    }


    onTouchStart(event) {
        event.preventDefault();
        if(event.touches) { // Check if this is a touch event
            // Update event to use first touch event
            event.clientX = event.touches[0].clientX;
            event.clientY = event.touches[0].clientY;
        }
        this.onMouseDown(event);
    }
    onTouchMove(event) {
        event.preventDefault();
        if(event.touches) { // Check if this is a touch event
            // Update event to use first touch event
            event.clientX = event.touches[0].clientX;
            event.clientY = event.touches[0].clientY;
        }
        this.onMouseMove(event);
    }
    onTouchEnd(event) {
        event.preventDefault();
        this.onMouseUp(event);
    }
}


