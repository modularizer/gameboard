class CustomScene extends THREE.Scene {
    constructor(item) {
        super();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // OrbitControls for panning, zooming, and rotating
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
         this.isDragging = false;
        this.controls.addEventListener('start', () => {
            this.shouldRotate = false;
            this.isDragging = true;
        });
        this.controls.addEventListener('end', () => {
            this.shouldRotate = true;
            this.isDragging = false;
        });


        this.shouldRotate = true; // Whether or not the item should rotate

        // Event listener for spacebar
        window.addEventListener('keydown', (event) => {
            if (event.code === 'Space' && !this.isDragging) {
                this.shouldRotate = !this.shouldRotate; // Toggle rotation
            }
        });

        this.display = this.display.bind(this);
        this.animate = this.animate.bind(this);
    }
    display(parentElement) {
        parentElement.appendChild(this.renderer.domElement);
    }
    animate(item) {
        this.item = item;
        requestAnimationFrame(this.animate.bind(this, item));
        if (this.shouldRotate) item.rotate(0.02, 0.01);
        this.controls.update();  // update OrbitControls
        this.renderer.render(this, this.camera);
    }
}
