const { parseFilter } = require('./parseFilter');

test('parse string', () => {
  const ast = parseFilter('"123"', 'string');
  console.log(JSON.stringify(ast));
  expect(ast).toEqual({
    conditionType: 'like',
    left: { exprType: 'placeholder' },
    right: { exprType: 'value', value: '%123%' },
  });
});
