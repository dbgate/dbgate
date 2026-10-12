function normalizeServerUrl(url, base) {
  try {
    return new URL(String(url).trim(), base || undefined).toString();
  } catch {
    return null;
  }
}

/**
 * The client names the server a REST / OData / GraphQL request goes to (the OpenAPI tab may use a
 * server listed in the definition). The request carries the connection's credentials and its
 * response is returned to the client, so only servers configured for the connection are accepted -
 * its URLs and the servers of its API definition. Any other server would let a user of the
 * connection send its credentials to a server of their choice, or reach services on the network
 * of DbGate.
 *
 * @returns the server normalized, or the empty value as it was (callers have their defaults)
 * @throws when the server is not one of the connection
 */
function resolveRestRequestServer(server, connection, apiInfo) {
  if (!server) return server;
  const base = connection?.apiServerUrl1;
  const allowed = [base, connection?.apiServerUrl2, ...(apiInfo?.servers ?? []).map(x => x?.url)]
    .filter(x => x && String(x).trim())
    .map(x => normalizeServerUrl(x, base))
    .filter(Boolean);
  const normalized = normalizeServerUrl(server, base);
  if (!normalized || !allowed.includes(normalized)) {
    throw new Error('DBGM-00000 The server URL is not one configured for this connection');
  }
  return normalized;
}

module.exports = resolveRestRequestServer;
