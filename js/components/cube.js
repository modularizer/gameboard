class Cube extends THREE.Group {
    constructor(sources, width = 1, height, depth, loader) {
        super();

        loader = loader || new THREE.TextureLoader();

        // Create a geometry
        const geometry = new THREE.BoxGeometry(width, height || width, depth || width);

        // Create materials for each face of the cube
        const materials = sources.map(src => new THREE.MeshBasicMaterial({ map: loader.load(src) }));

        // Create a mesh
        const cube = new THREE.Mesh(geometry, materials);

        this.add(cube);
    }

    rotate(rx = 0, ry = 0, rz = 0) {
        this.rotation.x += rx;
        this.rotation.y += ry;
        this.rotation.z += rz;
    }
}
