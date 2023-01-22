const { filesdir } = require('../utility/directories');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const runners = require('./runners');
const { hasPermission } = require('../utility/hasPermission');
const { getLogger } = require('dbgate-tools');

const logger = getLogger('scheduler');

const scheduleRegex = /\s*\/\/\s*@schedule\s+([^\n]+)\n/;

module.exports = {
  tasks: [],

  async unload() {
    this.tasks.forEach(x => x.destroy());
    this.tasks = [];
  },

  async processFile(file) {
    const text = await fs.readFile(file, { encoding: 'utf-8' });
    const match = text.match(scheduleRegex);
    if (!match) return;
    const pattern = match[1];
    if (!cron.validate(pattern)) return;
    logger.info(`Schedule script ${file} with pattern ${pattern}`);
    const task = cron.schedule(pattern, () => runners.start({ script: text }));
    this.tasks.push(task);
  },

  async reload(_params, req) {
    if (!hasPermission('files/shell/read', req)) return;
    const shellDir = path.join(filesdir(), 'shell');
    await this.unload();
    if (!(await fs.exists(shellDir))) return;
    const files = await fs.readdir(shellDir);
    for (const file of files) {
      await this.processFile(path.join(shellDir, file));
    }
  },

  async _init() {
    this.reload();
  },
};
