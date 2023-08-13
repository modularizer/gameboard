import {BaseModel} from './base_model.js';
import {loadCube, loadCylinder} from '../../js/components/cube.js';
import {load3DModel} from '../../js/components/3d_model.js';
import {loadText} from '../../js/components/text.js';

function loadModel(source) {
        if (typeof source === "string" && source.startsWith("{") && source.endsWith("}")) {
            source = JSON.parse(source);
        }
        if (source.isModelCopy){
            return Promise.resolve(source);
        }
        if ((typeof source === "object" && !source.text ) || (typeof source === "string" && source.toLowerCase().endsWith(".png"))){
            if (source.dimensions && source.dimensions.radius){
                return loadCylinder(source);
            }
            return loadCube(source);
        }else if (typeof source === "string"  && source.endsWith(".json")|| (typeof source === "object" && source.text)){
            return loadText(source);
        }else{
            return load3DModel(source);
        }
    }


class Model extends BaseModel {
    constructor({src, color, name, position, rotation, moveable, metadata}) {
        if (src instanceof Promise){
            super(src);
        }else{
            super(loadModel(src));
        }
        if (color !== undefined) this.setColor(color);
        if (name) this.name = name;
        if (position) this.position.set(position.x, position.y, position.z);
        if (rotation) this.pivot.rotation.set(rotation.x, rotation.y, rotation.z);
        if (metadata) this.metadata = metadata;
        if (moveable) this.moveable = moveable;
    }
}


function placeModels(sourcePositions, spacing = 0){
    let models = {};
    let delay = 0;
    for (let [name, details] of Object.entries(sourcePositions)){
        delay += spacing;
        let model = new Model(details);
        models[name] = model;
    }
    return models;
}




function loadJSON(scene, src){
    let folder = src.substring(0, src.lastIndexOf("/")+1);
    return fetch(src).then(r => r.json()).then(json => {
        let metadata = json.metadata || {};
        if (json.metadata){
            delete json.metadata;
        }
        let snaps = json.snaps;
        delete json.snaps;
        let sceneSpec = json.scene;
        delete json.scene;
        if (sceneSpec){
            scene.updateConfig(sceneSpec);
        }

        let models = {};
        for (let [name, details] of Object.entries(json)){
            details.name = name;
            if (typeof details.src === "string"){
                details.src = details.src.replaceAll("GAME/", folder);
            }else{
                details.src = JSON.parse(JSON.stringify(details.src).replaceAll("GAME/", folder));
            }
            let model = new Model(details);
            models[name] = model;
            if (details.moveable) {
                scene.addModel(model);
            }else{
                scene.add(model);
            }
        }
        scene.loadPromise.then(() => {
            for (let [name, details] of Object.entries(json)){
                let model = models[name];
                if (details.snap){

                    let s = snaps[details.snap];
                    model.setSnapController(s.y, s.step, s.offset, s.lockedAxes, s.freeAxes, s.rotationLockedAxes, s.rotationFreeAxes, s.positionNodes, s.rotationNodes);
                    model.snap();
                }else if (details.snap === false){
                    model.snapController = null;
                }
                if (details.animation){
                    if (details.animation.rotation) {
                        let r = details.animation.rotation;
                        model.startRotation(r.x, r.y, r.z);
                    }
                    if (details.animation.position) {
                        let p = details.animation.position;
                        model.startTranslation(p.x, p.y, p.z);
                    }
                }
            }
        })
        return {models, metadata};
    })
}



export { Model, placeModels, loadJSON};