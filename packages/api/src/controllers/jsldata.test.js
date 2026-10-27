// Regression tests for jsldata/save-text and jsldata/save-rows: they wrote archive files
// (archive://... ids) without the archive/write permission that the archive routes require.

jest.mock('../shell', () => ({}));
jest.mock('../utility/getJslFileName', () => ({ openJslFileForWrite: jest.fn() }));
jest.mock('../utility/hasPermission', () => ({ testStandardPermission: jest.fn() }));

const getJslFileName = require('../utility/getJslFileName');
const { testStandardPermission } = require('../utility/hasPermission');
const jsldata = require('./jsldata');

const req = { user: { login: 'alice' } };
const handle = { writeFile: jest.fn(), write: jest.fn(), close: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  getJslFileName.openJslFileForWrite.mockResolvedValue(handle);
});

test('writing an archive file needs archive/write', async () => {
  testStandardPermission.mockRejectedValueOnce(new Error('DBGM-00265 Permission archive/write not granted'));
  await expect(jsldata.saveText({ jslid: 'archive://folder/file', text: 'x' }, req)).rejects.toThrow(/archive\/write/);
  testStandardPermission.mockRejectedValueOnce(new Error('DBGM-00265 Permission archive/write not granted'));
  await expect(jsldata.saveRows({ jslid: 'file:///data/archive/f/x.jsonl', rows: [] }, req)).rejects.toThrow(
    /archive\/write/
  );
  expect(getJslFileName.openJslFileForWrite).not.toHaveBeenCalled();
});

test('result sets (plain ids) and the desktop app are not restricted', async () => {
  await jsldata.saveRows({ jslid: '6b3f8a52-8f4e-4c1a-9e3d-0f1e2d3c4b5a', rows: [{ a: 1 }] }, req);
  await jsldata.saveText({ jslid: 'archive://folder/file', text: 'x' });
  expect(testStandardPermission).not.toHaveBeenCalled();
  expect(handle.write).toHaveBeenCalledWith('{"a":1}\n');
});
