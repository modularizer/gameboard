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

        // Add axes helper
        if (this.config.axes.show) this.addAxesHelper();

        // Add grid helper
        if (this.config.grid.show) this.addGridHelper();

    }
    config = {
        camera: {
            type: "perspective",
            params: {
                fov: 75,
                aspect: window.innerWidth / window.innerHeight,
                near: 0.1,
                far: 1000,
            },
        },
        renderer: {
            clearColor: 0xffffff,
            clearAlpha: 0,
            size: {
                width: window.innerWidth,
                height: window.innerHeight,
            }

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
    }
    lookAt(x, y, z) {
        super.lookAt(new Vector3(x, y, z));
    }
    addCamera(){
        if (this.config.camera.type == "perspective"){
            this.camera = new THREE.PerspectiveCamera(
                this.config.camera.params.fov,
                this.config.camera.params.aspect,
                this.config.camera.params.near,
                this.config.camera.params.far,
            );
        } else if (this.config.camera.type == "orthographic"){
            this.camera = new THREE.OrthographicCamera(
                this.config.camera.params.left,
                this.config.camera.params.right,
                this.config.camera.params.top,
                this.config.camera.params.bottom,
            );
        }
        this.camera.position.x = this.state.camera.position.x;
        this.camera.position.y = this.state.camera.position.y;
        this.camera.position.z = this.state.camera.position.z;
        this.state.camera.position = this.camera.position;
        this.add(this.camera);
    }
    add(item, position){
        if (position) item.position.set(position.x, position.y, position.z);
        item = new MoveableItem(item);
        this.state.items.push(item);
        this.item = item;
        super.add(item);
    }
    addRenderer(){
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(this.config.renderer.size.width, this.config.renderer.size.height);
        this.renderer.setClearColor(this.config.renderer.clearColor, this.config.renderer.clearAlpha);
    }
    addGridHelper(){
        const gridHelper = new THREE.GridHelper(this.config.grid.size, this.config.grid.divisions);
        this.add(gridHelper);
    }
    addAxesHelper(){
        const axesHelper = new THREE.AxesHelper(this.config.axes.size);
        this.add(axesHelper);
    }
    addKeyListeners(){
        window.addEventListener('keydown', (e) => {
            let k = e.key;
            if (e.shiftKey) k = "Shift+" + k;
            if (e.altKey) k = "Alt+" + k;
            if (e.ctrlKey) k = "Ctrl+" + k;
            if (e.metaKey) k = "Meta+" + k;
            if (e.fnKey) k = "Fn+" + k;
            console.log("keydown", k, this.keyListeners[k])
            if (this.keyListeners[k]) {
                this.keyListeners[k].bind(this)(e);
                e.preventDefault();
                e.stopPropagation();
            }
        })
    }
    addOrbitControls(){
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
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
        }
    }
    orbitListeners = {
        "start": ()=>{this.state.shouldAnimate = false; this.state._isDragging = true},
        "end": ()=>{this.state.shouldAnimate = true; this.state._isDragging = false},
    }

    display(parentElement) {
        parentElement.appendChild(this.renderer.domElement);
        this.animate();
    }
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        if (this.state.shouldAnimate){
            this.state.items.forEach(item => {
                item.moveFrame();
            })
        }
        this.controls.update();  // update OrbitControls
        this.renderer.render(this, this.camera);
    }
}


