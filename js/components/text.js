import * as THREE from 'three';

import { DeferredPromise } from '../utils/deferredPromise.js';

let knownFonts = {
    gentilis_bold: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/fonts/gentilis_bold.typeface.json',
    gentilis_regular: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/fonts/gentilis_regular.typeface.json',
    helvetiker_bold: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/fonts/helvetiker_bold.typeface.json',
    helvetiker_regular: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/fonts/helvetiker_regular.typeface.json',
    optimer_bold: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js/examples/fonts/optimer_bold.typeface.json',
}

function makeText(text, size = 1, color = 0x000000, height = 0.1,
                  fontPath = "helvetiker_regular", curveSegments = 12, bevelEnabled = false,
                  rotation = {x: -Math.PI/2, y: 0, z: 0}) {
    if (knownFonts[fontPath]) {fontPath = knownFonts[fontPath]}
    let loader = new THREE.FontLoader();
    let promise = new DeferredPromise();
    if (!fontPath) {
        console.error("Font is not provided. Please load a font and pass it to the SimpleText constructor.");
        return;
    }

    loader.load(fontPath, function (font) {
        const textGeometry = new THREE.TextGeometry(text, {font, size, height, curveSegments, bevelEnabled});
        const textMaterial = new THREE.MeshBasicMaterial({ color: color });
        let mesh = new THREE.Mesh(textGeometry, textMaterial);
        mesh.rotation.set(rotation.x, rotation.y, rotation.z);
        let g = new THREE.Group();
        g.add(mesh);
        promise.resolve(g);
    });
    return promise.promise;
}

export function loadText(config){
    if (typeof config === "string") config = { text: config };
    return makeText(config.text, config.size, config.color, config.height, config.fontPath, config.curveSegments, config.bevelEnabled);
}
