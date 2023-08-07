import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader';
import { STLLoader } from 'three/addons/loaders/STLLoader';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';

import { DeferredPromise, IndexedDBBackend } from 'utils';

let loadPaths = {}
let objectLoader = new THREE.ObjectLoader();

const db = new IndexedDBBackend();
window.db = db;
window.loadPaths = loadPaths;

let i = 0;

export function load3DModel(path, delay = 0) {
    var loader;

    let fileType = path.toLowerCase().split('.').pop();

    let promise = new DeferredPromise();
    i += 1;
    let name = path + "-" + i;

    promise.promise.then(()=>{console.timeEnd(name);})
    let o = loadPaths[path];
    if (o) {
        console.time(name);
        const obj = objectLoader.parse(o);
        promise.resolve(obj);
        return promise.promise;
    }
    setTimeout(() => {
        console.time(name);
        o = loadPaths[path];
        if (o) {
            const obj = objectLoader.parse(o);
            promise.resolve(obj);
        }else{
            db.getItem(path).then((o) => {
                if (o) {
                    loadPaths[path] = o;
                    const obj = objectLoader.parse(o);
                    promise.resolve(obj);
                    return;
                }
                promise.promise.then((object) => {
                    o = object.toJSON();
                    loadPaths[path] = o;
                    db.setItem(path, o);
                })

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
            });
        }
    }, delay);
    return promise.promise;
}


