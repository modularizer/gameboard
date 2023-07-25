// assuming OrbitControls is available in the global scope or has been imported
class CustomScene extends THREE.Scene {
    constructor() {
        super();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // OrbitControls for panning, zooming, and rotating
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);

        this.display = this.display.bind(this);
        this.animate = this.animate.bind(this);
    }
    display(parentElement) {
        parentElement.appendChild(this.renderer.domElement);
    }
    animate(item) {
        requestAnimationFrame(this.animate.bind(this, item));
        item.rotate(0.02, 0.01);
        this.controls.update();  // update OrbitControls
        this.renderer.render(this, this.camera);
    }
}
