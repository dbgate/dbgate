// Regression tests for model transform files (database-connections/structure with
// modelTransFile). The transform file named any shell API function, which was called with the
// file's arguments, and its name could point outside the files/modtrans folder.

const os = require('os');
const path = require('path');
const fsNode = require('fs');

const mockFilesDir = fsNode.mkdtempSync(path.join(os.tmpdir(), 'dbgate-modtrans-test-'));
const mockApi = {
  dataTypeMapperTransform: jest.fn(() => model => ({ ...model, mapped: true })),
  runScript: jest.fn(() => () => null),
};
jest.mock('./directories', () => ({ filesdir: () => mockFilesDir }));
jest.mock('../shell', () => mockApi);

const loadModelTransform = require('./loadModelTransform');

fsNode.mkdirSync(path.join(mockFilesDir, 'modtrans'));
fsNode.writeFileSync(
  path.join(mockFilesDir, 'modtrans', 'types.json'),
  JSON.stringify({ transform: 'dataTypeMapperTransform', arguments: ['int', 'bigint'] })
);
fsNode.writeFileSync(
  path.join(mockFilesDir, 'modtrans', 'evil.json'),
  JSON.stringify({ transform: 'runScript', arguments: ['require("child_process")'] })
);
fsNode.writeFileSync(
  path.join(mockFilesDir, 'outside.json'),
  JSON.stringify({ transform: 'dataTypeMapperTransform', arguments: [] })
);

beforeEach(() => jest.clearAllMocks());

test('a model transform is loaded and applied', async () => {
  const trans = await loadModelTransform('types.json');
  expect(trans({ tables: [] })).toEqual({ tables: [], mapped: true });
  expect(mockApi.dataTypeMapperTransform).toHaveBeenCalledWith('int', 'bigint');
});

test('functions that are not model transforms are never called', async () => {
  expect(await loadModelTransform('evil.json')).toBeNull();
  expect(mockApi.runScript).not.toHaveBeenCalled();
});

test('a transform file outside the modtrans folder is refused', async () => {
  expect(await loadModelTransform('../outside.json')).toBeNull();
  expect(mockApi.dataTypeMapperTransform).not.toHaveBeenCalled();
});
