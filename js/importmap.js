

const importMap = {
    imports: {
      "three": "https://unpkg.com/three@0.132.2/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.132.2/examples/jsm/",
      "three/loaders": "https://unpkg.com/three@0.132.2/examples/jsm/loaders/",
      "utils": `./js/utils/index.js?${Date.now()}`,
      "gameengine": `./js/index.js?${Date.now()}`,
    }
};

//<script async src="https://unpkg.com/es-module-shims@1.6.3/dist/es-module-shims.js"></script>
const esModuleShims = document.createElement('script');
esModuleShims.type = 'module-shim';
esModuleShims.src = "https://unpkg.com/es-module-shims/dist/es-module-shims.js";
document.head.append(esModuleShims);

const script = document.createElement('script');
script.type = 'importmap';
script.innerHTML = JSON.stringify(importMap);

const mqttScript = document.createElement('script');
mqttScript.type = 'text/javascript';
mqttScript.src = "https://unpkg.com/mqtt/dist/mqtt.min.js";
//<script type="text/javascript" src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
document.head.append(mqttScript);

document.head.append(script);