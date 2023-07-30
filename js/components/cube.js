import * as THREE from 'three';
import { DeferredPromise } from 'utils';

import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

function getMaterial(v, loader){
    let loadPromise = false;
    if (v instanceof THREE.MeshStandardMaterial){
        // do nothing
    }else if (v instanceof THREE.Texture){
        v = new THREE.MeshStandardMaterial({ map: v });
    }else if (v instanceof THREE.Color){
        v = new THREE.MeshStandardMaterial({ color: v });
    }else if (typeof v === "string"){
        if (v.includes(".") || v.includes("/") || v.includes("\\")){
             let deferredLoadPromise = new DeferredPromise();
             v = new THREE.MeshStandardMaterial({
                map: loader.load(v, deferredLoadPromise.resolve, undefined, deferredLoadPromise.reject)
             });
             loadPromise = deferredLoadPromise.promise;

        }else{
            v = new THREE.MeshStandardMaterial({ color: new THREE.Color(v) });
        }
    }
    v.castShadow = true;
    v.receiveShadow = true;
    return [v, loadPromise]
}

function underside(material){
    let m = material.clone();
    m.flipY = true;
    return m;
}


export class Cube extends THREE.Group {
    constructor(sources, dimensions, loader) {
        super();
        dimensions = dimensions || {};
        sources = sources || {};

        loader = loader || new THREE.TextureLoader();

        let dimensionNames = ["width", "height", "depth"];
        let pairs = [["front", "back"], ["left", "right"], ["top", "bottom"]]

        // initialize the dimensions structure we will use to auto-detect dimensions
        dimensions = {
            width: {
                input: dimensions.width,
                top: null,
                bottom: null,
                front: null,
                back: null,
            },
            height: {
                input: dimensions.height,
                front: null,
                back: null,
                left: null,
                right: null,
            },
            depth: {
                input: dimensions.depth,
                top: null,
                bottom: null,
                left: null,
                right: null,
            }
        }

        // initialize the materials structure
        let materials = Object.assign({
            front: null,
            back: null,
            left: null,
            right: null,
            top: null,
            bottom: null,
        }, sources);

        let promises = [];

        // Load the images / colors / textures / materials which are specified
        for (let [k, v] of Object.entries(materials)) {
            if (v){
                // load the material
                let [mat, loadPromise] = getMaterial(v, loader)
                materials[k] = mat

                if (loadPromise){
                    promises.push(loadPromise);
                    loadPromise.then((texture) => {
                        if (["top", "bottom"].includes(k)) {
                            dimensions.width[k] = texture.image.naturalWidth;
                            dimensions.depth[k] = texture.image.naturalHeight;
                        }else if (["front", "back"].includes(k)) {
                            dimensions.width[k] = texture.image.naturalWidth;
                            dimensions.height[k] = texture.image.naturalHeight;
                        }else if (["left", "right"].includes(k)) {
                            dimensions.depth[k] = texture.image.naturalWidth;
                            dimensions.height[k] = texture.image.naturalHeight;
                        }
                    })
                }
            }
        }


        Promise.all(promises).then(() => {
            // Auto-detect the dimensions of the cube based on the average of image dimensions
            let avgDimensions = {}
            for (let [k, v] of Object.entries(dimensions)) {
                let sum = 0;
                let count = 0;
                for (let [k2, v2] of Object.entries(v)) {
                    if (k2 !== "input" && v2){
                        sum += v2;
                        count += 1;
                    }
                }
                avgDimensions[k] = sum?(sum/count):0;;
            }

            // normalize the dimensions measured from the images
            let meanDimension = (avgDimensions.width + avgDimensions.height + avgDimensions.depth) / 3;
            avgDimensions = {
                width: avgDimensions.width / meanDimension,
                height: avgDimensions.height / meanDimension,
                depth: avgDimensions.depth / meanDimension,
            }

            // resolve conflicts between explicitly specified dimensions and auto-detected dimensions
            let numDimensionInputs = dimensionNames.filter(k => dimensions[k].input != null).length;
            if (numDimensionInputs === 0){
                // No dimensions specified, so use the average dimensions
                dimensions = avgDimensions;
            }else if (numDimensionInputs === 1){
                // Only one dimension specified, so use the average dimensions but scale it to match the specified dimension
                let k = dimensionNames.find(k => dimensions[k].input != null);
                let scale = dimensions[k].input / avgDimensions[k];
                dimensions = {
                    width: avgDimensions.width * scale,
                    height: avgDimensions.height * scale,
                    depth: avgDimensions.depth * scale,
                }
            }else if (numDimensionInputs === 2){
                // Two dimensions specified, so use the average dimensions to detect the third dimension
                let missingDimension = dimensionNames.find(k => dimensions[k].input == null);
                let avgDim = avgDimensions[missingDimension];
                let val = 0;
                for (let k of dimensionNames){
                    if (k !== missingDimension && avgDimensions[k]){
                        val += (avgDim  * avgDimensions[k] / dimensions[k].input);
                    }
                }
                val /= 2;

                dimensions = {
                    width: dimensions.width.input,
                    height: dimensions.height.input,
                    depth: dimensions.depth.input,
                }
                dimensions[missingDimension] = val;
                console.warn(numDimensionInputs, missingDimension, avgDimensions, dimensions)
            }else{
                dimensions = {
                    width: dimensions.width.input,
                    height: dimensions.height.input,
                    depth: dimensions.depth.input,
                }
            }

            for (let [a, b] of pairs) {
                console.log({[a]: materials[a], [b]: materials[b]})
                if (materials[a] && materials[b]){
                    // do nothing
                }else if (materials[a]){
                    materials[b] = underside(materials[a]);
                }else if (materials[b]){
                    materials[a] = underside(materials[b]);
                }else{
                    materials[a] = new THREE.MeshStandardMaterial({color: this.config.defaultColors[a]});
                    materials[b] = new THREE.MeshStandardMaterial({color: this.config.defaultColors[b]});
                }
            }

            // Create a geometry
            let sizes = [dimensions.width, dimensions.height, dimensions.depth]
            sizes.sort();
            let avgSide = (sizes[0] + sizes[1]) / 2;
            let minSide = this.config.minDimension * avgSide;
            dimensions = {
                width: dimensions.width || minSide,
                height: dimensions.height || minSide,
                depth: dimensions.depth || minSide,
            }
            this.geometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
            this.geometry.translate(0, dimensions.height / 2, 0); // translate the geometry upwards by half of its height

            // Create a mesh
            console.log(dimensions, Object.values(materials));
            const cube = new THREE.Mesh(this.geometry, [
                materials.right,
                materials.left,
                materials.top,
                materials.bottom,
                materials.front,
                materials.back,
            ]);
            cube.castShadow = this.config.castShadow;
            cube.receiveShadow = this.config.receiveShadow;
            this.castShadow = this.config.castShadow;
            this.receiveShadow = this.config.receiveShadow;

            this.add(cube);
            this.addOriginCube();
            this.addWireframe();
        });
    }
    config = {
        castShadow: true,
        receiveShadow: true,
        minDimension: 0.01,
        wireframe: {
            visible: false,
            color: 0x00ff00,
            thickness: 5,
        },
        originCube: {
            visible: false,
            color: 0x00ff00,
            thickness: 0.1,
        },
        selected: {
            scale: 1.1,
            wireframe: true,
            originCube: true,
        },
        defaultColors: {
            front: "gray",
            back: "gray",
            left: "gray",
            right: "gray",
            top: "white",
            bottom: "gray",
        }
    }
    getRepresentativeSize(){
        let size = new THREE.Vector3();
        this.geometry.computeBoundingBox();
        this.geometry.boundingBox.getSize(size);
        let sizes = [size.x, size.y, size.z];
        sizes.sort();
        let avgSize = (sizes[0] + sizes[1]) / 2;
        return avgSize;
    }
    addOriginCube(){
      // Create a small cube at the object's origin
        let s = this.getRepresentativeSize();
        let t = this.config.originCube.thickness;
        const geometry = new THREE.BoxGeometry(s*t, s*t, s*t);
        const material = new THREE.MeshBasicMaterial({color: this.config.originCube.color});
        const cube = new THREE.Mesh(geometry, material);
        cube.visible = this.config.originCube.visible;
        this.add(cube);
        this.originCube = cube;
    }
    addWireframe() {
        // create an edges geometry and pass in your cube geometry
        let edges = new THREE.EdgesGeometry( this.geometry );

        // create a LineGeometry
        let geometry = new LineGeometry();
        geometry.setPositions( edges.attributes.position.array );

        let avgSize = this.getRepresentativeSize();
        let s = avgSize * this.config.wireframe.thickness;

        // create a LineMaterial and specify the color and linewidth
        let material = new LineMaterial({
            color: this.config.wireframe.color,
            linewidth: s,  // Set the line width here
        });

        // create a Line2 (Line with width) and store it
        let wireframeMesh = new Line2(geometry, material);

        // You must call this method after any change to line properties, including the position of the camera
        material.resolution.set(window.innerWidth, window.innerHeight);
        wireframeMesh.visible = this.config.wireframe.visible;
        this.wireframe = wireframeMesh;
        this.add(wireframeMesh);
    }
    rotate(rx = 0, ry = 0, rz = 0) {
        this.rotation.x += rx;
        this.rotation.y += ry;
        this.rotation.z += rz;
    }
    onMouseDown(event) {
        console.warn("onMouseDown", event)
        let m = this.config.selected.scale;
        this.scale.set(m, m, m);
        this.wireframe.visible = this.config.selected.wireframe;
        this.originCube.visible = this.config.selected.originCube;
    }
    onMouseUp(event) {
        this.scale.set(1, 1, 1);
        this.wireframe.visible = false;
        this.originCube.visible = false;
    }
    onRightClickDown(event) {
    }
    onRightClickMove(event) {

    }
    onRightClickUp(event) {

    }
}