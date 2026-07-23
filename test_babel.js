const fs = require('fs');
const Babel = require('./vendor/babel.min.js');

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script type="text\/babel" data-presets="react-classic">([\s\S]*?)<\/script>/);

if (!scriptMatch) {
  console.log("No babel script found!");
  process.exit(1);
}

const code = scriptMatch[1];

try {
  Babel.transform(code, { presets: ['react'] });
  console.log("BABEL COMPILE SUCCESS!");
} catch (e) {
  console.error("BABEL COMPILE ERROR:");
  console.error(e.message);
  process.exit(1);
}
