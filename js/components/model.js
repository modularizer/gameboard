import {BaseModel} from './base_model.js';
import {loadCube} from '../../js/components/cube.js';
import {load3DModel} from '../../js/components/3d_model.js';
import {loadText} from '../../js/components/text.js';


function loadModel(source, delay) {
        if (typeof source === "string" && source.startsWith("{") && source.endsWith("}")) {
            source = JSON.parse(source);
        }


        if (source.isModelCopy){
            return Promise.resolve(source);
        }
        if ((typeof source === "object" && !source.text ) || (typeof source === "string" && source.toLowerCase().endsWith(".png"))){
            return loadCube(source);
        }else if (typeof source === "string"  && source.endsWith(".json")|| (typeof source === "object" && source.text)){
            return loadText(source);
        }else{
            return load3DModel(source, delay);
        }
    }

class Model extends BaseModel {
    constructor(source, delay) {
        if (source instanceof Promise){
            super(source);
        }else{
            super(loadModel(source, delay));
        }

    }
}


function placeModels(sourcePositions, spacing = 0){
    let models = {};
    let delay = 0;
    for (let [name, details] of Object.entries(sourcePositions)){
        delay += spacing;
        let model = new Model(details.src, delay);
        if (details.position) model.position.set(details.position.x, details.position.y, details.position.z);
        models[name] = model;
    }
    return models;
}

export { Model, placeModels};