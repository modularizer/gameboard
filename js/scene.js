class CustomScene extends THREE.Scene {
    constructor() {
        super();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.display = this.display.bind(this);
        this.animate = this.animate.bind(this);
    }
    display(parentElement) {
        parentElement.appendChild(this.renderer.domElement);
    }
    animate(item) {
        requestAnimationFrame(this.animate.bind(this, item));
        item.rotate(0.02, 0.01);
        this.renderer.render(this, this.camera);
    }
}