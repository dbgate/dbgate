const postcss = require('postcss');
const fs = require('fs');
const path = require('path');

const production = process.env.NODE_ENV === 'production';

async function buildTailwind() {
  const inputFile = path.resolve(__dirname, 'src/tailwind.css');
  const outputFile = path.resolve(__dirname, 'public/build/tailwind.css');

  const css = fs.readFileSync(inputFile, 'utf8');

  const plugins = [require('@tailwindcss/postcss')({}), require('autoprefixer')({})];

  const result = await postcss(plugins).process(css, {
    from: inputFile,
    to: outputFile,
  });

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });

  // Write processed CSS
  fs.writeFileSync(outputFile, result.css);

  // Write source map in dev mode
  if (!production && result.map) {
    fs.writeFileSync(outputFile + '.map', result.map.toString());
  }

  console.log('Tailwind CSS built successfully');
}

buildTailwind().catch(err => {
  console.error('Error building tailwind CSS:', err);
  process.exit(1);
});
