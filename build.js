const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['./js/importmap.js', './js/gameboard.js'],
  bundle: true,
  minify: true,
  outdir: 'minjs/',
  format: 'esm',
}).catch(() => process.exit(1));
