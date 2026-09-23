// Regression tests for the grant that lets an autoExecute team file run for a user who is
// allowed to use it but not to read it.
//
// This token used to be signed with a constant compiled into the source
// ('14813c43-a91b-4ad1-9dcd-a81bd7dbb05f' in authCommon.getStaticTokenSecret), which is public
// - DbGate is open source. Anyone could mint one for arbitrary SQL and have
// sessions.executeQuery skip both the dbops/query permission and the run_script database role.

const jwt = require('jsonwebtoken');
const {
  createTeamFileExecToken,
  verifyTeamFileExecToken,
  getTeamFileExecTarget,
  hashTeamFileContent,
  TEAM_FILE_EXEC_TOKEN_USE,
} = require('./teamFileExecToken');
const authCommon = require('../auth/authCommon');
const platformInfo = require('./platformInfo');

const LEAKED_CONSTANT = '14813c43-a91b-4ad1-9dcd-a81bd7dbb05f';

// the pinned target of the file the grant came from, and the session it is spent on
const TARGET = { conid: 'conid1', database: 'db1' };
const SESSION = { conid: 'conid1', database: 'db1' };

// the existing tests read as booleans; the module returns the grant, or null when it refuses
const verifies = (token, sql, req, session = SESSION) => verifyTeamFileExecToken(token, sql, req, session) != null;

const SQL = 'select * from invoices';
const teamFileContent = `-- >>>\n-- autoExecute: true\n-- <<<\n${SQL}`;

const alice = { user: { userId: 11, amoid: 'local', login: 'alice' } };
const bob = { user: { userId: 12, amoid: 'local', login: 'bob' } };

describe('team file execution token', () => {
  test('the removed hardcoded secret is no longer exported', () => {
    expect(authCommon.getStaticTokenSecret).toBeUndefined();
  });

  test('accepts a token this server issued, for the same caller and the same statement', () => {
    const token = createTeamFileExecToken(teamFileContent, 42, alice, TARGET);
    expect(verifies(token, SQL, alice)).toEqual(true);
  });

  test('accepts the statement with its front matter still attached', () => {
    // the client re-serialises the front matter (that is where the token itself travels), so
    // only the executable body may be hashed
    const token = createTeamFileExecToken(teamFileContent, 42, alice, TARGET);
    const sqlWithFrontMatter = `-- >>>\n-- autoExecute: true\n-- useToken: ${token}\n-- <<<\n${SQL}`;
    expect(verifies(token, sqlWithFrontMatter, alice)).toEqual(true);
  });

  test('rejects a token forged with the leaked constant', () => {
    const forged = jwt.sign(
      {
        tokenUse: TEAM_FILE_EXEC_TOKEN_USE,
        userId: 11,
        amoid: 'local',
        contentHash: hashTeamFileContent('drop table invoices'),
      },
      LEAKED_CONSTANT
    );
    expect(verifies(forged, 'drop table invoices', alice)).toEqual(false);
  });

  test('rejects a token forged with the old md5 content hash under the leaked constant', () => {
    // the exact shape the original code accepted
    const crypto = require('crypto');
    const evilSql = 'drop table invoices';
    const forged = jwt.sign(
      { contentHash: crypto.createHash('md5').update(evilSql).digest('hex') },
      LEAKED_CONSTANT
    );
    expect(verifies(forged, evilSql, alice)).toEqual(false);
  });

  test('rejects a token signed with the API session secret', () => {
    const forged = jwt.sign(
      {
        tokenUse: TEAM_FILE_EXEC_TOKEN_USE,
        userId: 11,
        amoid: 'local',
        ...TARGET,
        contentHash: hashTeamFileContent(SQL),
      },
      authCommon.getTokenSecret()
    );
    expect(verifies(forged, SQL, alice)).toEqual(false);
  });

  test('rejects replay of another user token', () => {
    const token = createTeamFileExecToken(teamFileContent, 42, alice, TARGET);
    expect(verifies(token, SQL, bob)).toEqual(false);
  });

  // userId alone does not separate callers. The AD provider signs `loginRows[0]?.id ?? -1`, so
  // every AD user without a stored row is -1; the OAuth and MS Entra providers leave userId
  // undefined, which jwt drops from the payload. Binding on userId+amoid alone made every such
  // user of a provider one identity, and any of them could spend another's grant.
  describe('rejects replay between users a provider does not give a distinct userId', () => {
    test.each([
      ['AD, both users without a stored row', 'ad', -1, -1],
      ['OAuth, userId omitted from the payload', 'oauth', undefined, undefined],
      ['MS Entra, userId omitted from the payload', 'msentra', undefined, undefined],
    ])('%s', (_label, amoid, aliceUserId, bobUserId) => {
      const first = { user: { amoid, login: 'alice', userId: aliceUserId, licenseUid: `${amoid}:alice` } };
      const second = { user: { amoid, login: 'bob', userId: bobUserId, licenseUid: `${amoid}:bob` } };

      const token = createTeamFileExecToken(teamFileContent, 42, first, TARGET);
      expect(verifies(token, SQL, first)).toEqual(true);
      expect(verifies(token, SQL, second)).toEqual(false);
    });
  });

  // the environment-variable providers in auth/authProvider.js issue no licenseUid at all, so
  // login has to carry the separation there
  test('rejects replay between two users of a provider that issues no licenseUid', () => {
    const first = { user: { amoid: 'logins', login: 'alice' } };
    const second = { user: { amoid: 'logins', login: 'bob' } };

    const token = createTeamFileExecToken(teamFileContent, 42, first, TARGET);
    expect(verifies(token, SQL, first)).toEqual(true);
    expect(verifies(token, SQL, second)).toEqual(false);
  });

  test('rejects replay between two providers that share a login', () => {
    const adAlice = { user: { amoid: 'ad', login: 'alice', userId: -1, licenseUid: 'ad:alice' } };
    const oauthAlice = { user: { amoid: 'oauth', login: 'alice', licenseUid: 'oauth:alice' } };

    const token = createTeamFileExecToken(teamFileContent, 42, adAlice, TARGET);
    expect(verifies(token, SQL, oauthAlice)).toEqual(false);
  });

  // The grant used to name no target at all, so once it verified, executeQuery skipped the
  // run_script role for any session the caller could open - a user with connection access but
  // no role on another database could spend a grant from a dev file against production.
  describe('binding to the connection and database the file pins', () => {
    test('reads the target from the file front matter', () => {
      expect(getTeamFileExecTarget({ autoExecute: true, connectionId: 'conid1', databaseName: 'db1' })).toEqual(TARGET);
    });

    test('a file that pins no connection has no target', () => {
      expect(getTeamFileExecTarget({ autoExecute: true })).toBeNull();
      expect(getTeamFileExecTarget(undefined)).toBeNull();
    });

    test('accepts the session the grant names', () => {
      const token = createTeamFileExecToken(teamFileContent, 42, alice, TARGET);
      expect(verifies(token, SQL, alice, { conid: 'conid1', database: 'db1' })).toEqual(true);
    });

    test('refuses another database on the same connection', () => {
      const token = createTeamFileExecToken(teamFileContent, 42, alice, TARGET);
      expect(verifies(token, SQL, alice, { conid: 'conid1', database: 'production' })).toEqual(false);
    });

    test('refuses another connection', () => {
      const token = createTeamFileExecToken(teamFileContent, 42, alice, TARGET);
      expect(verifies(token, SQL, alice, { conid: 'conid2', database: 'db1' })).toEqual(false);
    });

    test('refuses a session that is not there at all', () => {
      const token = createTeamFileExecToken(teamFileContent, 42, alice, TARGET);
      // called directly: the `verifies` helper would substitute its default session
      expect(verifyTeamFileExecToken(token, SQL, alice, undefined)).toBeNull();
    });

    test('reports a targeted grant as target bound', () => {
      const token = createTeamFileExecToken(teamFileContent, 42, alice, TARGET);
      expect(verifyTeamFileExecToken(token, SQL, alice, SESSION)).toEqual({ teamFileId: 42, isTargetBound: true });
    });

    // an unpinned file says nothing about where it may run, so the grant still verifies - it
    // carries the statement - but executeQuery keeps the run_script role for it
    test('a grant from an unpinned file verifies anywhere but is not target bound', () => {
      const token = createTeamFileExecToken(teamFileContent, 42, alice, null);
      expect(verifyTeamFileExecToken(token, SQL, alice, { conid: 'other', database: 'production' })).toEqual({
        teamFileId: 42,
        isTargetBound: false,
      });
    });

    test('carries the team file it came from, for the caller to re-derive access from', () => {
      const token = createTeamFileExecToken(teamFileContent, 42, alice, TARGET);
      expect(verifyTeamFileExecToken(token, SQL, alice, SESSION).teamFileId).toEqual(42);
    });
  });

  describe('callers with no identity to bind to', () => {
    test('no token is minted for an authenticated request carrying no identifying claim', () => {
      expect(createTeamFileExecToken(teamFileContent, 42, { user: {} }, TARGET)).toBeNull();
      expect(createTeamFileExecToken(teamFileContent, 42, {}, TARGET)).toBeNull();
    });

    // one principal by design, not an accidental collapse: every anonymous caller holds the same
    // permissions, so a replayed grant gives nothing getContent would not hand over anyway
    test('the anonymous provider is still served, because its callers are one principal', () => {
      const anonymous = { user: { amoid: 'anonymous', licenseUid: 'anonymous' } };
      const token = createTeamFileExecToken(teamFileContent, 42, anonymous, TARGET);
      expect(token).not.toBeNull();
      expect(verifies(token, SQL, anonymous)).toEqual(true);
    });

    test('Electron has a single local user and no request at all', () => {
      platformInfo.isElectron = true;
      try {
        const token = createTeamFileExecToken(teamFileContent, 42, undefined, TARGET);
        expect(token).not.toBeNull();
        expect(verifies(token, SQL, undefined)).toEqual(true);
      } finally {
        platformInfo.isElectron = false;
      }
    });
  });

  test('rejects a token used for a different statement', () => {
    const token = createTeamFileExecToken(teamFileContent, 42, alice, TARGET);
    expect(verifies(token, 'drop table invoices', alice)).toEqual(false);
  });

  test('rejects an expired token', () => {
    const expired = jwt.sign(
      {
        tokenUse: TEAM_FILE_EXEC_TOKEN_USE,
        userId: 11,
        amoid: 'local',
        ...TARGET,
        contentHash: hashTeamFileContent(SQL),
      },
      authCommon.getPurposeTokenSecret(TEAM_FILE_EXEC_TOKEN_USE),
      { expiresIn: -10 }
    );
    expect(verifies(expired, SQL, alice)).toEqual(false);
  });

  test('rejects a token minted for another purpose', () => {
    const otherPurpose = jwt.sign(
      { tokenUse: 'something-else', userId: 11, amoid: 'local', ...TARGET, contentHash: hashTeamFileContent(SQL) },
      authCommon.getPurposeTokenSecret('something-else')
    );
    expect(verifies(otherPurpose, SQL, alice)).toEqual(false);
  });

  test('rejects missing and malformed tokens without throwing', () => {
    expect(verifies(undefined, SQL, alice)).toEqual(false);
    expect(verifies(null, SQL, alice)).toEqual(false);
    expect(verifies('', SQL, alice)).toEqual(false);
    expect(verifies('not.a.jwt', SQL, alice)).toEqual(false);
    expect(verifies({ toString: () => 'x' }, SQL, alice)).toEqual(false);
  });

  test('the purpose secret is domain separated from the session secret', () => {
    expect(authCommon.getPurposeTokenSecret(TEAM_FILE_EXEC_TOKEN_USE)).not.toEqual(authCommon.getTokenSecret());
    expect(authCommon.getPurposeTokenSecret('a')).not.toEqual(authCommon.getPurposeTokenSecret('b'));
    // stable within the process, so a token stays valid for its lifetime
    expect(authCommon.getPurposeTokenSecret('a')).toEqual(authCommon.getPurposeTokenSecret('a'));
  });
});
