class ImageMaterial extends THREE.MeshBasicMaterial {
    constructor(src, side=THREE.FrontSide, loader) {
        loader = loader || new THREE.TextureLoader();
        super({map: loader.load(src), side: side});
    }
}

class Card extends THREE.Group {
    constructor(frontSrc, backSrc, loader, width=1, height=1) {
        loader = loader || new THREE.TextureLoader();
        super();

        // Create materials for the front and back
        this.frontMaterial = new ImageMaterial(frontSrc, THREE.FrontSide, loader);
        this.backMaterial = new ImageMaterial(backSrc, THREE.BackSide, loader);

        this.geometry = new THREE.PlaneGeometry(width, height);


        // Create a mesh for the front and back
        this.frontCard = new THREE.Mesh(this.geometry, this.frontMaterial);
        this.backCard = new THREE.Mesh(this.geometry, this.backMaterial);

        this.add(this.frontCard);
        this.add(this.backCard);

    }
    rotate(rx=0, ry=0, rz=0) {
        this.rotation.x += rx;
        this.rotation.y += ry;
        this.rotation.z += rz;
    }
}