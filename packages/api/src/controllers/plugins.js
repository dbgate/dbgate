const fs = require('fs-extra');
const fetch = require('node-fetch');
const path = require('path');
const pacote = require('pacote');
const { pluginstmpdir } = require('../utility/directories');

module.exports = {
  script_meta: 'get',
  async script({ packageName }) {
    const data = await fs.readFile('/home/jena/jenasoft/dbgate-plugin-csv/lib/frontend.js', {
      encoding: 'utf-8',
    });
    return data;
  },

  search_meta: 'get',
  async search({ filter }) {
    const response = await fetch(`https://api.npms.io/v2/search?q=keywords:dbgate ${encodeURIComponent(filter)}`);
    const json = await response.json();
    console.log(json);
    const { results } = json || {};
    return results || [];
  },

  readme_meta: 'get',
  async readme({ packageName }) {
    const dir = path.join(pluginstmpdir(), packageName);
    if (!(await fs.exists(dir))) {
      await pacote.extract(packageName, dir);
    }
    const file = path.join(dir, 'README.md');
    if (await fs.exists(file)) return await fs.readFile(file, { encoding: 'utf-8' });
    return '';
  },
};
