import { parseFilter } from './parseFilter';

test('parse string', () => {
  const ast = parseFilter('"123"', 'string');
  console.log(JSON.stringify(ast));
  expect(ast).toBe(3);
});
