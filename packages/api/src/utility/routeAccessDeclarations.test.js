// Every API route must declare who may call it (`<method>_access` next to `<method>_meta`, see
// routeAccess.js); useController refuses a route without a valid declaration. This test reads the
// controller sources, so a route added without a declaration fails here, not only at runtime.

const fs = require('fs');
const path = require('path');
const { validateRouteAccess } = require('./routeAccess');

const controllersDir = path.join(__dirname, '..', 'controllers');
const controllerFiles = fs.readdirSync(controllersDir).filter(x => x.endsWith('.js') && !x.endsWith('.test.js'));

// the value of `<name>_access:` up to the end of its expression (object literals included)
function readAccessLiteral(source, name) {
  const match = source.match(new RegExp(`^\\s+${name}_access:\\s*`, 'm'));
  if (!match) return undefined;
  let i = match.index + match[0].length;
  let depth = 0;
  let res = '';
  for (; i < source.length; i++) {
    const c = source[i];
    if (c == '{' || c == '[') depth++;
    if (c == '}' || c == ']') depth--;
    if (depth == 0 && (c == ',' || c == '\n')) break;
    res += c;
  }
  return res.trim();
}

const routes = [];
for (const file of controllerFiles) {
  const source = fs.readFileSync(path.join(controllersDir, file), 'utf-8');
  for (const match of source.matchAll(/^\s+([A-Za-z0-9_]+)_meta:/gm)) {
    routes.push([`${file}/${match[1]}`, source, match[1]]);
  }
}

test('the controllers expose routes', () => {
  expect(routes.length).toBeGreaterThan(200);
});

test.each(routes)('%s declares valid access', (label, source, name) => {
  const literal = readAccessLiteral(source, name);
  expect(literal).toBeDefined();
  // eslint-disable-next-line no-new-func
  const access = new Function(`return (${literal});`)();
  expect(validateRouteAccess(access)).toBe(true);
});
