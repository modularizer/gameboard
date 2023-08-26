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


function templateString(template, values){
    for (let [key, value] of Object.entries(values)){
        if (typeof value === "string"){
            template = template.replaceAll("$" + key, value);
        }else{
            template = template.replaceAll('"$' + key + '"', JSON.stringify(value));
            template = template.replaceAll("$" + key, JSON.stringify(value));
        }
    }
    return template;
}

function templateItem(templateObject, values){
    let template = JSON.stringify(templateObject);
    template = templateString(template, values);
    return JSON.parse(template);
}

function loadJSON(scene, src){
    let folder = src.substring(0, src.lastIndexOf("/")+1);
    return fetch(src).then(r => r.json()).then(json => {
        // update scene config
        if (json.scene){
            scene.updateConfig(json.scene);
        }

        // perform for loops
        let forModels = {};
        if (json.repeatedModels){
            for (let [key, value] of Object.entries(json.repeatedModels)){
                let templateName = value.template;
                if (!templateName){
                    throw new Error("template is required for for loop");
                }
                delete value.template;
                let combinations = [];

                if (Object.keys(value).length === 1 && Object.keys(value)[0] === "count"){
                    for (let i = 0; i < value.count; i++){
                        combinations.push({})
                    }
                }else{
                    let values = {}
                    for (let [k, v] of Object.entries(value)){
                        if (Array.isArray(v)){
                            values[k] = v;
                        }else if (Object.keys(v).filter(_v => !["start", "stop", "step"].includes(_v)).length === 0){// if all keys in start, stop, step
                            let start = v.start || 0;
                            let step = v.step || 1;
                            let stop = v.stop || 0;
                            let _v = [];
                            for (let i = start; i <= stop; i += step){
                                _v.push(i);
                            }
                            values[k] = _v;
                        }else {
                            values[k] = [v];
                        }
                    }

                    // get all combinations of values
                    // values is a dict of key: [values], e.g. {"a": [1,2,3], "b": [2, 4, 6], "c": [8], "d": [9, 10]}
                    // combinations is a list of dicts, e.g. [{"a": 1, "b": 2, "c": 8, "d": 9}, {"a": 1, "b": 2, "c": 8, "d": 10}, ...]

                    for (let [k, v] of Object.entries(values)){
                    let _combinations = [];
                    for (let _v of v){
                        if (combinations.length === 0){
                            _combinations.push({[k]: _v});
                        }else{
                            for (let c of combinations){
                                let _c = JSON.parse(JSON.stringify(c)); // deep copy
                                _c[k] = _v; // add new key
                                _combinations.push(_c);
                            }
                        }
                    }
                    combinations = _combinations;
                }
                }

                for (let [i, combination] of Object.entries(combinations)){
                    let c = Object.assign({i: i}, combination);
                    combination.template = templateName;
                    forModels[templateString(key, c)] = combination;
                }
            }
        }
        console.log("forModels", forModels);
        json.models = {...json.models, ...forModels};


        // perform template substitution of templates
        for (let [name, details] of Object.entries(json.templates)){
            if (details.template){
                const templateName = details.template;
                delete details.template;
                const templateDetails = json.templates[templateName];
                details = templateItem(templateDetails, details);
                json.templates[name] = details;
            }
        }

        // perform template substitution
        for (let [name, details] of Object.entries(json.models)){
            if (details.template){
                const templateName = details.template;
                delete details.template;
                const templateDetails = json.templates[templateName];
                details = templateItem(templateDetails, details);
                json.models[name] = details;
            }
        }

        // perform alias substitution
        if (json.aliases){
            json.models = templateItem(json.models, json.aliases);
        }

        // shuffle models
        let keys = Object.keys(json.models);
        keys.sort(() => Math.random() - 0.5);
        let shuffledModels = {};
        for (let key of keys){
            shuffledModels[key] = json.models[key];
        }
        json.models = shuffledModels;


        let models = {};
        let freshState = {};
        let modelsSpec = {};
        for (let [name, details] of Object.entries(json.models)){
            details.name = name;

            if (typeof details.src === "string"){
                details.src = details.src.replaceAll("GAME/", folder);
            }else{
                details.src = JSON.parse(JSON.stringify(details.src).replaceAll("GAME/", folder));
            }
            let model = new Model(details);
            models[name] = model;
            if (details.moveable) {
                freshState[name] = {
                    position: model.position.toArray(),
                    rotation: model.pivot.rotation.toArray()
                }
                scene.addModel(model, details.position, details.rotation);
            }else{
                scene.add(model);
            }
            modelsSpec[name] = details;
        }
        scene.freshState = freshState;
        scene.loadPromise.then(() => {
            for (let [name, details] of Object.entries(modelsSpec)){
                let model = models[name];
                if (details.snap){
                    let s = json.snaps[details.snap];
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
        json.models = models;
        json.metadata = json.metadata || {};
        return json;
    })
}



export { Model, placeModels, loadJSON};