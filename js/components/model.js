import {BaseModel} from './base_model.js';
import {loadCube} from '../../js/components/cube.js';
import {load3DModel} from '../../js/components/3d_model.js';
import {loadText} from '../../js/components/text.js';


function loadModel(source, ...args) {
        if ((typeof source === "object" && !source.text )
         || (typeof source === "string" && source.toLowerCase().endsWith(".png"))){
            return loadCube(source, ...args);
        }else if (typeof source === "string"  && source.endsWith(".json")|| (typeof source === "object" && source.text)){
            return loadText(source, ...args);
        }else{
            return load3DModel(source, ...args);
        }
    }

class Model extends BaseModel {
    constructor(source, ...args) {
        super(loadModel(source, ...args));
    }
}


function placeModels(sourcePositions){
    let models = {};
    for (let [name, details] of Object.entries(sourcePositions)){
        let model = new Model(details.src);
        if (details.position) model.position.set(details.position.x, details.position.y, details.position.z);
        models[name] = model;
    }
    return models;
}

export { Model, placeModels};