const gameboardMinPath = 'build/gameboard.min.js';
const fs = require('fs').promises;
const path = require('path');
const versionFile = 'version';
const JavaScriptObfuscator = require('javascript-obfuscator');
const directory = path.join(__dirname, 'assets', 'games');
const indexHtmlPath = path.join(__dirname, 'index.html');


const args = process.argv.slice(2);

let shouldMinify = args.includes('--min');
const shouldObfuscate = args.includes('--obf');

if (shouldObfuscate) {
  shouldMinify = true;
}
console.log(`Minifying: ${shouldMinify}`);
console.log(`Obfuscating: ${shouldObfuscate}`);

async function updateVersion() {
    let newVersion = new Date().toISOString().replace(/-/g,"");
    if (args.includes('--inc')) {
        const versionData = (await fs.readFile(versionFile, 'utf8')).trim();
        // if the version file is empty, start at 0.0.0
        // if the version matches \d+\.\d+\.\d+, increment the patch version
        // otherwise, use the datetime as the version
        if (versionData === '') {
            newVersion = '0.0.0';
        }else if (versionData.match(/\d+\.\d+\.\d+/)) {
            newVersion = versionData.replace(/(\d+\.\d+\.)\d+/, (_, p1) => {
                return p1 + (parseInt(versionData.split('.')[2], 10) + 1).toString();
            });
        }else{
            newVersion = new Date().toISOString().replace(/-/g,"");
         }
    }else{
        const versionIndex = args.indexOf('--version');
        if (versionIndex !== -1) {
            newVersion = args[versionIndex + 1];
            if (newVersion === "date") {
              newVersion = new Date().toISOString().replace(/-/g,"");
            }
        }
    }
    if (newVersion) {
        await fs.writeFile(versionFile, newVersion, 'utf8');

        const indexFilePath = path.join(__dirname, 'src', 'js', 'index.js');
        let indexFileData = await fs.readFile(indexFilePath, 'utf8');
        // replace all instances of ?v0.0.5"; with the new version
        indexFileData = indexFileData.replace(/\?v.*";/g, `?v${newVersion}";`);
        indexFileData = indexFileData.replace(/window\.version = 'v.*';/g, `window.version = 'v${newVersion}';`);
        await fs.writeFile(indexFilePath, indexFileData, 'utf8');


        let indexHTMLData = await fs.readFile(indexHtmlPath, 'utf8');
        indexHTMLData = indexHTMLData.replace(/"build\/gameboard\.min\.js\?v.*?"/g, `"build/gameboard.min.js?v${newVersion}"`);
        await fs.writeFile(indexHtmlPath, indexHTMLData, 'utf8');
        console.log(`Version updated to ${newVersion}`);
    }

}

updateVersion().catch(err => {
  console.error('An error occurred:', err);
  process.exit(1);
}).then(() => {

require('esbuild').build({
  entryPoints: ['src/js/index.js'],
  bundle: true,
  outfile: gameboardMinPath,
  external: [
    'three',
    'three/*'
  ],
  platform: 'browser',
  format: 'esm',
  minify: shouldMinify, // Add this line to minify the output
  pure: ['console.log'],
}).then(() => {
    console.log(`Built ${gameboardMinPath}`);
  fs.readdir(directory)
    .then(folders => {
        console.log("Minifying spec.json files");
      const promises = folders.map(folder => {
        const specPath = path.join(directory, folder, 'spec.json');
        return fs.readFile(specPath, 'utf8')
          .then(data => {
            const minified = JSON.stringify(JSON.parse(data));
            return fs.writeFile(specPath.replace('spec.json', 'spec.min.json'), minified);
          })
          .then(() => console.log(`Minified ${specPath}`));
      });

      return Promise.all(promises);
    })
    .then(() => fs.readFile(gameboardMinPath, 'utf8'))
    .then(data => {
      // Make sure this regular expression matches the occurrences of "spec.json" in your file
      console.log("Replacing spec.json with spec.min.json")
      const updatedData = data.replaceAll("spec.json", "spec.min.json");
      return fs.writeFile(gameboardMinPath, updatedData);
    }).then(() => {
        if (shouldObfuscate){
            console.log(`Obfuscating ${gameboardMinPath}`);
            fs.readFile(gameboardMinPath, 'utf8')
            .then(data => {
              const obfuscationResult = JavaScriptObfuscator.obfuscate(data, {
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 1,
                numbersToExpressions: true,
                simplify: true,
                shuffleStringArray: true,
                splitStrings: true,
                stringArrayThreshold: 1
              });
              console.log(`Writing obfuscated code to ${gameboardMinPath}`);
              return fs.writeFile(gameboardMinPath, obfuscationResult.getObfuscatedCode());
            })
        }
    })
    .catch(err => console.error('An error occurred:', err));
})
.catch(() => process.exit(1));

});