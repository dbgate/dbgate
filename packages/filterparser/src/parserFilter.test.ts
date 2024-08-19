const { parseFilter } = require('./parseFilter');
const { stringFilterBehaviour } = require('dbgate-tools');

test('parse string', () => {
  const ast = parseFilter('"123"', stringFilterBehaviour);
  console.log(JSON.stringify(ast));
  expect(ast).toEqual({
    conditionType: 'like',
    left: { exprType: 'placeholder' },
    right: { exprType: 'value', value: '%123%' },
  });
});
