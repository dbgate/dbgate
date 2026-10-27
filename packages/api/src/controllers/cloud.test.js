// cloud/public-file-data appends the path to the DbGate Cloud API URL, sent with the licence
// headers of the server. '..' was refused, but '%2e%2e' passed - the URL parser treats it as '..'
// as well, so the request could leave /public.

jest.mock('../utility/cloudIntf', () => ({ getPublicFileData: jest.fn(async path => ({ path })) }));
jest.mock('./connections', () => ({}));
jest.mock('../utility/socket', () => ({}));
jest.mock('../utility/crypting', () => ({}));
jest.mock('../utility/authProxy', () => ({}));
jest.mock('../utility/platformInfo', () => ({ isElectron: false }));
jest.mock('../utility/security', () => ({}));

const { getPublicFileData } = require('../utility/cloudIntf');
const cloud = require('./cloud');

beforeEach(() => jest.clearAllMocks());

describe('cloud.publicFileData', () => {
  test('passes a path of plain segments', async () => {
    await cloud.publicFileData({ path: 'themes/dark theme.json' });
    expect(getPublicFileData).toHaveBeenCalledWith('themes/dark%20theme.json');
  });

  test.each([['../secret'], ['themes/../../secret'], ['./x'], ['/absolute'], ['a//b'], ['a\\b'], ['a?x=1'], [42]])(
    'refuses %p',
    async path => {
      await expect(cloud.publicFileData({ path })).rejects.toThrow('Invalid public file path');
      expect(getPublicFileData).not.toHaveBeenCalled();
    }
  );

  test('an encoded dot segment stays a plain name and cannot leave /public', async () => {
    for (const path of ['%2e%2e/secret', '.%2E/secret', '%2e%2e%2fsecret']) {
      await cloud.publicFileData({ path });
    }
    for (const [sent] of getPublicFileData.mock.calls) {
      const url = new URL(`https://cloud.example/public/${sent}`);
      expect(url.pathname.startsWith('/public/')).toBe(true);
    }
  });
});
