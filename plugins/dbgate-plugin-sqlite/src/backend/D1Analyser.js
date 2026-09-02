const Analyser = require('./Analyser');
const {
  D1_SCHEMA_SNAPSHOT_SQL,
  applyD1SnapshotContentHashes,
  buildD1SchemaSnapshot,
} = require('./cloudflare/d1SchemaSnapshot');

/**
 * D1-specific analyser which checks the schema with one REST query. The standard SQLite snapshot
 * uses table-valued index PRAGMAs, which D1 does not support and would otherwise expand into many
 * HTTP requests.
 */
class D1Analyser extends Analyser {
  async _getFastSnapshot() {
    const result = await this.driver.query(this.dbhan, D1_SCHEMA_SNAPSHOT_SQL);
    return buildD1SchemaSnapshot(result.rows);
  }

  async _runAnalysis() {
    const structure = await super._runAnalysis();
    const snapshot = await this._getFastSnapshot();
    return applyD1SnapshotContentHashes(structure, snapshot);
  }
}

module.exports = D1Analyser;
