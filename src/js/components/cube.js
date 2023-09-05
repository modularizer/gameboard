import * as THREE from 'three';
import { DeferredPromise } from '../utils/deferredPromise.js';

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
        }else if (["transparent", "clear", "none"].includes(v)){
            v = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0 });
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

export function loadCube(sources){
    sources = sources || {};
    if (typeof sources === "string"){
        sources = { front: sources };
    }

    let minDimension = sources.minDimension || 0.01;
    let defaultColors = sources.colors || {
        front: "gray",
        back: "gray",
        left: "gray",
        right: "gray",
        top: "white",
        bottom: "gray",
    };
    let dimensions = sources.dimensions || {}

    let loader = new THREE.TextureLoader();

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
    let promise = new DeferredPromise();

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
        }else{
            dimensions = {
                width: dimensions.width.input,
                height: dimensions.height.input,
                depth: dimensions.depth.input,
            }
        }

        for (let [a, b] of pairs) {
            if (materials[a] && materials[b]){
                // do nothing
            }else if (materials[a]){
                materials[b] = underside(materials[a]);
            }else if (materials[b]){
                materials[a] = underside(materials[b]);
            }else{
                materials[a] = new THREE.MeshStandardMaterial({color: defaultColors[a]});
                materials[b] = new THREE.MeshStandardMaterial({color: defaultColors[b]});
            }
        }

        // if any sides are transparent, make all sides double-sided
        let transparent = false;
        for (let [k, v] of Object.entries(materials)) {
            if (v.transparent){
                transparent = true;
            }
        }
        if (transparent){
            for (let [k, v] of Object.entries(materials)) {
                v.side = THREE.BackSide;
            }
        }


        // Create a geometry
        let sizes = [dimensions.width, dimensions.height, dimensions.depth]
        sizes.sort();
        let avgSide = (sizes[0] + sizes[1]) / 2;
        let minSide = minDimension * avgSide;
        dimensions = {
            width: dimensions.width || minSide,
            height: dimensions.height || minSide,
            depth: dimensions.depth || minSide,
        }
        let geometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
//            this.geometry.translate(0, dimensions.height/2, 0);

        // Create a mesh
        const cube = new THREE.Mesh( geometry, [
            materials.right,
            materials.left,
            materials.top,
            materials.bottom,
            materials.front,
            materials.back,
        ]);
        cube.position.set(0, dimensions.height/2, 0);
        promise.resolve(cube);
    }).catch(console.error);

    return promise.promise;
}


export function loadCylinder(sources, minDimension = 0.1) {
  let loader = new THREE.TextureLoader();

  let materials = Object.assign({
    top: "white",
    bottom: "black",
    side: "gray"
  }, sources);

  let promises = [];
  let promise = new DeferredPromise();

  for (let [k, v] of Object.entries(materials)) {
    let [mat, loadPromise] = getMaterial(materials[k], loader);
      materials[k] = mat;
      promises.push(loadPromise);
  }

  Promise.all(promises).then(() => {
    let radius = sources.dimensions.radius || 1;
    let height = sources.dimensions.height || 1;
    let segments = 32;

    // Sides
  let sideGeometry = new THREE.CylinderGeometry(radius, radius, height, 32);
  let sideMesh = new THREE.Mesh(sideGeometry, [materials.side, materials.top, materials.bottom]);
  sideMesh.position.set(-radius, height/2, -radius);
  promise.resolve(sideMesh);
    });

  return promise.promise;
}
