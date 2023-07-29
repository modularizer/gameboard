class DeferredPromise {
    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        })
    }
}



function getMaterial(v, loader){
    let loadPromise = false;
    if (v instanceof THREE.MeshBasicMaterial){
        // do nothing
    }else if (v instanceof THREE.Texture){
        v = new THREE.MeshBasicMaterial({ map: v });
    }else if (v instanceof THREE.Color){
        v = new THREE.MeshBasicMaterial({ color: v });
    }else if (typeof v === "string"){
        if (v.includes(".") || v.includes("/") || v.includes("\\")){
             let deferredLoadPromise = new DeferredPromise();
             v = new THREE.MeshBasicMaterial({
                map: loader.load(v, deferredLoadPromise.resolve, undefined, deferredLoadPromise.reject)
             });
             loadPromise = deferredLoadPromise.promise;

        }else{
            v = new THREE.MeshBasicMaterial({ color: new THREE.Color(v) });
        }
    }
    return [v, loadPromise]
}

function underside(material){
    let m = material.clone();
    m.flipY = true;
    return m;
}


class Cube extends THREE.Group {
    constructor(sources, dimensions, loader) {
        super();

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
                    if (k !== missingDimension){
                        val += (dimensions[k].input * avgDim / avgDimensions[k]);
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
                    materials[a] = new THREE.MeshBasicMaterial({color: defaultColors[a]});
                    materials[b] = new THREE.MeshBasicMaterial({color: defaultColors[b]});
                }

            }


            // Create a geometry
            dimensions = {
                width: dimensions.width || 0.01,
                height: dimensions.height || 0.01,
                depth: dimensions.depth || 0.01,
            }
            const geometry = new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);

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

            this.add(cube);
        });
    }

    rotate(rx = 0, ry = 0, rz = 0) {
        this.rotation.x += rx;
        this.rotation.y += ry;
        this.rotation.z += rz;
    }
}
