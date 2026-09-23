// Regression tests for the re-derivation behind a team-file execution grant.
//
// The grant let sessions.executeQuery skip the run_script database role, and it named neither a
// target nor anything verifiable about the file it came from: teamFileId was minted into the
// token and never looked at. A user with connection access but no role on another database could
// take the grant handed to them for an auto-execute file and spend it there.
//
// execGrantStillStands is what closes that: the file is loaded by the claimed id and every
// condition getContent minted the grant under is checked again, against the session the
// statement would actually run in.

jest.mock('./storageDb', () => ({
  storageGetExistingFileWithContent: jest.fn(),
}));
jest.mock('../utility/hasPermission', () => ({
  loadPermissionsFromRequest: jest.fn(async () => []),
  hasPermission: jest.fn(() => false),
}));
jest.mock('../auth/storageAuthProvider', () => ({ getBuiltinRoleIdFromRequest: jest.fn(() => 1) }));
jest.mock('../utility/socket', () => ({ emitChanged: jest.fn() }));

const { storageGetExistingFileWithContent } = require('./storageDb');
const teamFiles = require('./teamFiles');

const SQL = 'select * from invoices';
const alice = { user: { userId: 11, amoid: 'local', login: 'alice' } };
const SESSION = { conid: 'conid1', database: 'db1' };

function storedFile(frontMatterLines, sql = SQL) {
  return {
    id: 42,
    type_name: 'sql',
    team_folder_id: 1,
    owner_user_id: 99,
    file_content: `-- >>>\n${frontMatterLines.map(x => `-- ${x}`).join('\n')}\n-- <<<\n${sql}`,
  };
}

describe('teamFiles.execGrantStillStands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // use access is granted unless a test says otherwise
    jest.spyOn(teamFiles, 'checkFileUseAccess').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const pinned = () => storedFile(['autoExecute: true', 'connectionId: conid1', 'databaseName: db1']);
  const unpinned = () => storedFile(['autoExecute: true']);

  test('stands for the file, statement and session the grant was minted for', async () => {
    storageGetExistingFileWithContent.mockResolvedValue(pinned());
    expect(await teamFiles.execGrantStillStands(42, SQL, SESSION, alice)).toEqual({ isTargetBound: true });
  });

  test('falls for another database on the pinned connection', async () => {
    storageGetExistingFileWithContent.mockResolvedValue(pinned());
    expect(
      await teamFiles.execGrantStillStands(42, SQL, { conid: 'conid1', database: 'production' }, alice)
    ).toBeNull();
  });

  test('falls for another connection', async () => {
    storageGetExistingFileWithContent.mockResolvedValue(pinned());
    expect(await teamFiles.execGrantStillStands(42, SQL, { conid: 'conid2', database: 'db1' }, alice)).toBeNull();
  });

  // Unpinning a file has to withdraw the database-role bypass at once. The grant still stands -
  // the caller may use the file - but it is no longer target bound, and sessions.executeQuery
  // reads that from here rather than from the token, which would carry the stale claim for the
  // rest of its 30 minutes.
  test('reports a grant as no longer target bound once the file is unpinned', async () => {
    storageGetExistingFileWithContent.mockResolvedValue(unpinned());
    expect(await teamFiles.execGrantStillStands(42, SQL, SESSION, alice)).toEqual({ isTargetBound: false });
  });

  // an unpinned file names no target, so there is nothing to compare - executeQuery keeps the
  // run_script role for such a grant instead
  test('stands anywhere for a file that pins no connection', async () => {
    storageGetExistingFileWithContent.mockResolvedValue(unpinned());
    expect(await teamFiles.execGrantStillStands(42, SQL, { conid: 'other', database: 'production' }, alice)).toEqual({
      isTargetBound: false,
    });
  });

  test('falls once the caller loses use access, without waiting for the token to expire', async () => {
    storageGetExistingFileWithContent.mockResolvedValue(pinned());
    // @ts-ignore
    teamFiles.checkFileUseAccess.mockResolvedValue(false);
    expect(await teamFiles.execGrantStillStands(42, SQL, SESSION, alice)).toBeNull();
  });

  test('falls when the statement is not the stored body of the file', async () => {
    storageGetExistingFileWithContent.mockResolvedValue(pinned());
    expect(await teamFiles.execGrantStillStands(42, 'drop table invoices', SESSION, alice)).toBeNull();
  });

  test('falls when the file is no longer marked autoExecute', async () => {
    storageGetExistingFileWithContent.mockResolvedValue(storedFile(['connectionId: conid1', 'databaseName: db1']));
    expect(await teamFiles.execGrantStillStands(42, SQL, SESSION, alice)).toBeNull();
  });

  test('falls for a teamFileId that no longer exists, or never did', async () => {
    storageGetExistingFileWithContent.mockResolvedValue(undefined);
    expect(await teamFiles.execGrantStillStands(9999, SQL, SESSION, alice)).toBeNull();
  });

  test('falls for a file that is not SQL at all', async () => {
    storageGetExistingFileWithContent.mockResolvedValue({ ...pinned(), type_name: 'json' });
    expect(await teamFiles.execGrantStillStands(42, SQL, SESSION, alice)).toBeNull();
  });
});
