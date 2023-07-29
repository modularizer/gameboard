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
        this.mouse = new THREE.Vector2();
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


        // Add axes helper
        if (this.config.axes.show) this.addAxesHelper();

        // Add grid helper
        if (this.config.grid.show) this.addGridHelper();

        this.addMouseListeners();

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
        selectedItem: null,
        planeY: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
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
    }
    addGridHelper(){
        this.gridHelper = new THREE.GridHelper(this.config.grid.size, this.config.grid.divisions);
        super.add(this.gridHelper);
    }
    addAxesHelper(){
        this.axesHelper = new THREE.AxesHelper(this.config.axes.size);
        super.add(this.axesHelper);
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
//        this.controls.enabled  = false;
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
    animate(t) {
        requestAnimationFrame(this.animate.bind(this));
        if (this.state.shouldAnimate){
            this.state.items.forEach(item => {
                item.moveFrame(t);
            })
        }
        this.controls.update();  // update OrbitControls
        this.renderer.render(this, this.camera);
    }

    getClickedItem(event) {
        // Calculate mouse position in normalized device coordinates
        this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
//        console.log(event.clientX, event.clientY, this.mouse.x, this.mouse.y)

        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera( this.mouse, this.camera );

//        this.showRay();

        // Calculate objects intersecting the picking ray
        let intersects = this.raycaster.intersectObjects( this.state.items, true);
        let o;
        let p;
        if (intersects.length){
            o = intersects[0].object;
            p = intersects[0].point;

            while (!this.state.items.includes(o)){
                o = o.parent;
            }
            this.offset.copy(intersects[0].point).sub(o.position);
        }else{
            o = null;
        }
        return [o, p];
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
    addMouseListeners() {
        window.addEventListener('mousedown', this.onMouseDown.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        window.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
    onMouseDown(event) {
        let [item, p] = this.getClickedItem(event);
        if (item && item.onMouseDown){
            this.state.planeY.constant = p.y;
            this.state.selectedItem = item;
            this.controls.enabled = false;
            this.state._isDragging = true;
            item.onMouseDown(event);
        }else{
            this.state.selectedItem = null;
            this.controls.enabled = true;
        }
    }
    onMouseMove(event) {
        let [item, p] = this.getClickedItem(event);
        item = this.state.selectedItem;
        if (this.state.selectedItem && item && item.onMouseMove) {
            let mousePos = new THREE.Vector3(
                (event.clientX / window.innerWidth) * 2 - 1,
                -(event.clientY / window.innerHeight) * 2 + 1,
                0.5
            );
            mousePos.unproject(this.camera); // this will give us position in 3D

            // get the position where the mouse position intersects the Z plane
            this.raycaster.ray.intersectPlane(this.state.planeY, mousePos);

            // adjust the z-coordinate of mousePos
            mousePos.y = this.state.planeY.constant;

            item.position.copy(mousePos).sub(this.offset);


//            let vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5).unproject(this.camera);
//            raycaster.ray.intersectPlane(planeZ, mousePos);
//            let dir = vector.sub(this.camera.position).normalize();
//            let distance = - this.camera.position.z / dir.z;
//            let pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
//
//            // Apply the offset to give the illusion of dragging the object
//
//            item.position.copy(pos).sub(this.offset);
//            console.warn(this.offset, pos, item.position)
//            item.onMouseMove(event);
//            item.position.set(pos)

            event.preventDefault();
            event.stopPropagation();
        }else if (this.state.selectedItem){
            this.state.selectedItem = null;
            this.state._isDragging = false;
            this.controls.enabled = this.wasOrbitEnabled;
            document.dispatchEvent(new MouseEvent('mouseup'));
        }
    }
    onMouseUp(event) {
        let item = this.state.selectedItem;
        if (item && item.onMouseUp) {
            this.state.selectedItem.onMouseUp(event);
            this.state.selectedItem = null;
            this.state._isDragging = false;

        }
        this.controls.enabled = true;
    }
}


