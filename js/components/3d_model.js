import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';
import { STLLoader } from 'three/addons/loaders/STLLoader';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';

import { DeferredPromise } from 'utils';

let loadPaths = {}




export function load3DModel(path) {
    var loader;

    let fileType = path.toLowerCase().split('.').pop();

    let promise = new DeferredPromise();
    if (loadPaths[path]) {
        loadPaths[path].then((object) => {
            // clone the object and material so that they can be used multiple times
            let clone = object.clone();
            clone.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry = child.geometry.clone();
                    child.material = Array.isArray(child.material)
                        ? child.material.map(m => m.clone())
                        : child.material.clone();
                }
            });
            clone.position.set(0, 0, 0);


            promise.resolve(clone);
        });
        return promise.promise;
    }
    loadPaths[path] = promise.promise;
    switch (fileType.toLowerCase()) {
        case 'gltf':
          loader = new THREE.GLTFLoader();
          loader.load(path, function (gltf) {
            promise.resolve(gltf.scene);
          });
          break;

        case 'obj':
          loader = new OBJLoader();
          loader.load(path, function (object) {
            promise.resolve(object);
          });
          break;

        case 'stl':
          loader = new THREE.STLLoader();
          loader.load(path, function (geometry) {
            let material = new THREE.MeshPhongMaterial({ color: 0xff5533, specular: 0x111111, shininess: 200 });
            var mesh = new THREE.Mesh(geometry, material);
            promise.resolve(mesh);
          });
          break;

        default:
          promise.reject('Unsupported file type:' + fileType);
          return;
    }
    return promise.promise;
}


