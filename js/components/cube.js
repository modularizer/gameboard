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
            console.log({materials, dimensions, avgDimensions, meanDimension})



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


            let defaultColors = {
                front: "gray",
                back: "gray",
                left: "gray",
                right: "gray",
                top: "white",
                bottom: "gray",
            }
            for (let [a, b] of pairs) {
                console.log({[a]: materials[a], [b]: materials[b]})
                if (materials[a] && materials[b]){
                    console.log("both")
                    // do nothing
                }else if (materials[a]){
                    console.log("one", a)
                    materials[b] = underside(materials[a]);
                    console.log("result", materials[b]);
                }else if (materials[b]){
                    console.log("one", b)
                    materials[a] = underside(materials[b]);
                    console.log("result", materials[a]);
                }else{
                    console.log("neither")
                    materials[a] = new THREE.MeshStandardMaterial({color: defaultColors[a]});
                    materials[b] = new THREE.MeshStandardMaterial({color: defaultColors[b]});
                }

            }


            // Create a geometry
            dimensions = {
                width: dimensions.width || 0.01,
                height: dimensions.height || 0.01,
                depth: dimensions.depth || 0.01,
            }
            const geometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
            geometry.translate(0, dimensions.height / 2, 0); // translate the geometry upwards by half of its height

            // Create a mesh
            console.log(dimensions, Object.values(materials));
            const cube = new THREE.Mesh(geometry, [
                materials.right,
                materials.left,
                materials.top,
                materials.bottom,
                materials.front,
                materials.back,
            ]);
            cube.castShadow = true;
            cube.receiveShadow = true;
            this.castShadow = true;
            this.receiveShadow = true;

            this.add(cube);
            this.makeWireframe();
        });
    }
    makeWireframe() {
        // create an edges geometry and pass in your cube geometry
        let edges = new THREE.EdgesGeometry( this.children[0].geometry );

        // create a LineGeometry
        let geometry = new LineGeometry();
        geometry.setPositions( edges.attributes.position.array );

        let size = new THREE.Vector3();
        this.children[0].geometry.computeBoundingBox();
        this.children[0].geometry.boundingBox.getSize(size);
        let avgSize = (size.x + size.y + size.z) / 3;
        let s = avgSize * 5;

        // create a LineMaterial and specify the color and linewidth
        let material = new LineMaterial({
            color: 0x00ff00,
            linewidth: s,  // Set the line width here
        });

        // create a Line2 (Line with width) and store it
        this.wireframeMesh = new Line2(geometry, material);

        // You must call this method after any change to line properties, including the position of the camera
        material.resolution.set(window.innerWidth, window.innerHeight);
    }
    rotate(rx = 0, ry = 0, rz = 0) {
        this.rotation.x += rx;
        this.rotation.y += ry;
        this.rotation.z += rz;
    }
    onMouseDown(event) {
        console.warn("onMouseDown", event)
        let m = 1.2;
        this.scale.set(1.2, 1.2, 1.2);
        this.add( this.wireframeMesh );
    }
    onMouseUp(event) {
        this.scale.set(1, 1, 1);
        this.remove( this.wireframeMesh );
    }
}