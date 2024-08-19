const { parseFilter } = require('./parseFilter');
const { StringFilterType } = require('./filterTypes');

test('parse string', () => {
  const ast = parseFilter('"123"', StringFilterType);
  console.log(JSON.stringify(ast));
  expect(ast).toEqual({
    conditionType: 'like',
    left: { exprType: 'placeholder' },
    right: { exprType: 'value', value: '%123%' },
  });
});
