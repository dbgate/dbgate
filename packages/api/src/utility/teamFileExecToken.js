const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { removeSqlFrontMatter } = require('dbgate-tools');
const { getPurposeTokenSecret } = require('../auth/authCommon');
const platformInfo = require('./platformInfo');
const timingSafeCheckToken = require('./timingSafeCheckToken');

// A team file may be marked `autoExecute`, which lets a user who has "use" access - but not
// "read" access - run it without ever seeing its text. That means sessions.executeQuery has to
// accept a statement the caller is not otherwise permitted to run, so the file's content is
// accompanied by a token that says "this exact statement was handed to this exact user".
//
// The token therefore has to be unforgeable by the user it is handed to. It is minted by
// teamFiles.getContent and checked by sessions.executeQuery, and both go through this module so
// the two sides cannot drift apart.
const TOKEN_USE = 'team-file-exec';

// Short-lived on purpose: the token exists to carry a single file from the team-file list into
// the query tab that opens for it, not to be a standing grant. A tab restored from storage the
// next day falls back to the caller's own permissions, which is the correct outcome.
const TOKEN_LIFETIME = '30m';

/**
 * Hashes the executable body of a team file, ignoring the front matter (which is where the
 * token itself lives, and which the client legitimately rewrites). Both the minting and the
 * verifying side must hash identically, which is why this is not inlined in either of them.
 *
 * @param {string} content
 */
function hashTeamFileContent(content) {
  return crypto
    .createHash('sha256')
    .update(removeSqlFrontMatter(content) ?? '')
    .digest('hex');
}

// The claims the grant is bound to. All of them are compared, because no single one is issued
// by every authentication flow:
//
//   licenseUid  provider-prefixed and unique per login ('ad:alice', 'oauth:alice', ...), but the
//               environment-variable providers in auth/authProvider.js never issue it
//   login       issued by every provider that has a named user, including those
//   userId      a storage row id, and only that: the AD provider signs -1 for a user with no
//               stored row, and the OAuth and MS Entra providers leave it undefined, which jwt
//               drops from the payload altogether. On its own it collapses every such user of a
//               provider into one identity, and one of them could then replay another's token
//   amoid       the provider itself, so two providers cannot collide on the same login
const IDENTITY_CLAIMS = ['licenseUid', 'login', 'userId', 'amoid'];

/**
 * The identity the token is bound to. Two different users must never produce the same value,
 * otherwise one could replay the other's token.
 *
 * Three deployments do produce one value for several people, and there that is correct rather
 * than a gap: the Electron app (no `req` at all, a single local user), the anonymous provider
 * (licenseUid 'anonymous', no login) and a server with authentication disabled. In each of them
 * the callers are one principal holding one set of permissions, so a replayed token grants
 * nothing the replayer could not obtain by asking teamFiles.getContent for the same file.
 */
function getTokenIdentity(req) {
  const identity = {};
  for (const claim of IDENTITY_CLAIMS) {
    identity[claim] = req?.user?.[claim] ?? null;
  }
  return identity;
}

function identityMatches(decoded, identity) {
  return IDENTITY_CLAIMS.every(claim => (decoded?.[claim] ?? null) === identity[claim]);
}

/**
 * The connection and database the grant is for, read from the team file's own front matter -
 * the "fixed connection" the file was saved with (QueryTab.toggleFixedConnection). This is the
 * only statement of intent the server has: the client picks the session, so anything the client
 * supplies at mint time would be chosen by the same person the grant is meant to constrain.
 *
 * Returns null for a file that pins no connection. Such a grant is not target bound, and
 * sessions.executeQuery keeps the run_script database role for it.
 *
 * @param {any} frontMatter
 * @returns {{ conid: string, database: string } | null}
 */
function getTeamFileExecTarget(frontMatter) {
  if (!frontMatter?.connectionId) {
    return null;
  }
  return {
    conid: frontMatter.connectionId,
    database: frontMatter.databaseName ?? null,
  };
}

/**
 * True when the grant names the session it is being spent on. An untargeted grant matches no
 * session, so the caller of verifyTeamFileExecToken has to read `isTargetBound` to know whether
 * the database role may be skipped.
 */
function targetMatches(decoded, session) {
  return (
    !!decoded?.conid && decoded.conid === session?.conid && (decoded.database ?? null) === (session?.database ?? null)
  );
}

/**
 * Mints the grant, or returns null when there is nothing to bind it to - an authenticated
 * request carrying no identifying claim at all. The caller then falls back to the ordinary
 * read-access check, which is the safe outcome: a grant nobody can be held to is not one worth
 * issuing.
 *
 * @param {string} content the team file content, as stored
 * @param {any} teamFileId
 * @param {any} req the request of the user the content is being handed to
 * @param {{ conid: string, database: string } | null} target the connection and database the
 *   file pins, from getTeamFileExecTarget, or null when it pins none
 * @returns {string | null}
 */
function createTeamFileExecToken(content, teamFileId, req, target) {
  const identity = getTokenIdentity(req);
  if (!platformInfo.isElectron && IDENTITY_CLAIMS.every(claim => identity[claim] == null)) {
    return null;
  }
  return jwt.sign(
    {
      tokenUse: TOKEN_USE,
      teamFileId: teamFileId ?? null,
      conid: target?.conid ?? null,
      database: target?.database ?? null,
      ...identity,
      contentHash: hashTeamFileContent(content),
    },
    getPurposeTokenSecret(TOKEN_USE),
    { expiresIn: TOKEN_LIFETIME }
  );
}

/**
 * Returns the grant only when `useToken` is a token this server issued, to this same caller, for
 * exactly the statement in `sql`, and - when the grant names a connection and database - for the
 * session it is being spent on. Never throws: a missing, malformed, expired or mismatched token
 * simply means the caller falls back to their own permissions.
 *
 * The returned `teamFileId` is a claim, not a verified fact. The caller reloads the file by it
 * and re-derives the access behind it (teamFiles.execGrantStillStands) before acting on the
 * grant, so that revoking someone's use access, or editing the file, takes effect immediately
 * rather than at the end of the token's lifetime.
 *
 * @param {string} useToken
 * @param {string} sql the statement the caller is asking to execute
 * @param {any} req
 * @param {{ conid: string, database: string } | undefined} session the session the statement
 *   would run in
 * @returns {{ teamFileId: any, isTargetBound: boolean } | null}
 */
function verifyTeamFileExecToken(useToken, sql, req, session) {
  if (!useToken || typeof useToken != 'string') {
    return null;
  }

  let decoded;
  try {
    decoded = jwt.verify(useToken, getPurposeTokenSecret(TOKEN_USE), { algorithms: ['HS256'] });
  } catch (err) {
    return null;
  }

  if (decoded?.tokenUse != TOKEN_USE) {
    return null;
  }

  if (!identityMatches(decoded, getTokenIdentity(req))) {
    return null;
  }

  // A grant that names a connection and database is only good for that one. A grant that names
  // none is still good for the statement, but it cannot stand in for the database role - see
  // isTargetBound at the call site.
  if (decoded.conid != null && !targetMatches(decoded, session)) {
    return null;
  }

  if (!timingSafeCheckToken(decoded.contentHash, hashTeamFileContent(sql))) {
    return null;
  }

  return { teamFileId: decoded.teamFileId ?? null, isTargetBound: decoded.conid != null };
}

module.exports = {
  TEAM_FILE_EXEC_TOKEN_USE: TOKEN_USE,
  TEAM_FILE_EXEC_IDENTITY_CLAIMS: IDENTITY_CLAIMS,
  hashTeamFileContent,
  getTeamFileExecTarget,
  createTeamFileExecToken,
  verifyTeamFileExecToken,
};
