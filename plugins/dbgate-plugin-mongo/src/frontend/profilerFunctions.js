const _ = require('lodash');

function formatProfilerEntry(obj) {
  const ts = obj.ts;
  const stats = { millis: obj.millis };
  let op = obj.op;
  let doc;
  let query;
  let ext;
  if (op == 'query') {
    const cmd = obj.command || obj.query;
    doc = cmd.find;
    query = cmd.filter;
    ext = _.pick(cmd, ['sort', 'limit', 'skip']);
  } else if (op == 'update') {
    doc = obj.ns.split('.').slice(-1)[0];
    query = obj.command && obj.command.q;
    ext = _.pick(obj, ['nModified', 'nMatched']);
  } else if (op == 'insert') {
    doc = obj.ns.split('.').slice(-1)[0];
    ext = _.pick(obj, ['ninserted']);
  } else if (op == 'remove') {
    doc = obj.ns.split('.').slice(-1)[0];
    query = obj.command && obj.command.q;
  } else if (op == 'command' && obj.command) {
    const cmd = obj.command;
    if (cmd.count) {
      op = 'count';
      query = cmd.query;
    } else if (cmd.aggregate) {
      op = 'aggregate';
      query = cmd.pipeline;
    } else if (cmd.distinct) {
      op = 'distinct';
      query = cmd.query;
      ext = _.pick(cmd, ['key']);
    } else if (cmd.drop) {
      op = 'drop';
    } else if (cmd.findandmodify) {
      op = 'findandmodify';
      query = cmd.query;
      ext = _.pick(cmd, ['sort', 'update', 'remove', 'fields', 'upsert', 'new']);
    } else if (cmd.group) {
      op = 'group';
      doc = cmd.group.ns;
      ext = _.pick(cmd, ['key', 'initial', 'cond', '$keyf', '$reduce', 'finalize']);
    } else if (cmd.map) {
      op = 'map';
      doc = cmd.mapreduce;
      query = _.omit(cmd, ['mapreduce', 'map', 'reduce']);
      ext = { map: cmd.map, reduce: cmd.reduce };
    } else {
      // unknown command
      op = 'unknown';
      query = obj;
    }
  } else {
    // unknown operation
    query = obj;
  }

  return {
    ts,
    op,
    doc,
    query,
    ext,
    stats,
  };
}

function extractProfileTimestamp(obj) {
  return obj.ts;
}

function aggregateProfileChartEntry(aggr, obj, stepDuration) {
  // const fmt = formatProfilerEntry(obj);

  const countAll = (aggr.countAll || 0) + 1;
  const sumMillis = (aggr.sumMillis || 0) + obj.millis;
  const maxDuration = obj.millis > (aggr.maxDuration || 0) ? obj.millis : aggr.maxDuration || 0;

  return {
    countAll,
    sumMillis,
    countPerSec: (countAll / stepDuration) * 1000,
    avgDuration: sumMillis / countAll,
    maxDuration,
  };

  //   return {
  //     ts: fmt.ts,
  //     millis: fmt.stats.millis,
  //     countAll: 1,
  //     countPerSec: 1,
  //   };
}

module.exports = {
  formatProfilerEntry,
  extractProfileTimestamp,
  aggregateProfileChartEntry,
};
