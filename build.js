const gameboardMinPath = 'gameboard.min.js';

require('esbuild').build({
  entryPoints: ['js/index.js'],
  bundle: true,
  outfile: gameboardMinPath,
  external: [
    'three',
    'three/*'
  ],
  platform: 'browser',
  format: 'esm',
  minify: true // Add this line to minify the output
}).then(() => {
  const fs = require('fs').promises;
  const path = require('path');

  const directory = 'games';

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
    .catch(err => console.error('An error occurred:', err));
})
.catch(() => process.exit(1));
