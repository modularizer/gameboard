const args = process.argv.slice(2);

let shouldMinify = args.includes('--min');
const shouldObfuscate = args.includes('--obf');
if (shouldObfuscate){
    shouldMinify = true;
}

const gameboardMinPath = 'gameboard.min.js';
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs').promises;

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
  minify: shouldMinify // Add this line to minify the output
}).then(() => {
  const path = require('path');

  const directory = 'assets/games';

  fs.readdir(directory)
    .then(folders => {
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
      const updatedData = data.replaceAll("spec.json", "spec.min.json");
      return fs.writeFile(gameboardMinPath, updatedData);
    })
    .then(() => console.log(`Updated references in ${gameboardMinPath}`))
    .then(() => {
        if (shouldObfuscate){
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
              return fs.writeFile(gameboardMinPath, obfuscationResult.getObfuscatedCode());
            })
        }
    })
    .catch(err => console.error('An error occurred:', err));
})
.catch(() => process.exit(1));
