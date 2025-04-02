const { tokenizeBySearchFilter } = require('./filterName');

test('tokenize single token', () => {
  const tokenized = tokenizeBySearchFilter('Album', 'al');
  // console.log(JSON.stringify(tokenized, null, 2));
  expect(tokenized).toEqual([
    { text: 'Al', isMatch: true },
    { text: 'bum', isMatch: false },
  ]);
});

test('tokenize two tokens', () => {
  const tokenized = tokenizeBySearchFilter('Album', 'al,um');
  // console.log(JSON.stringify(tokenized, null, 2));
  expect(tokenized).toEqual([
    { text: 'Al', isMatch: true },
    { text: 'b', isMatch: false },
    { text: 'um', isMatch: true },
  ]);
});
