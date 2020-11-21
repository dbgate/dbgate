const fs = require('fs-extra');
const fetch = require('node-fetch');

module.exports = {
  script_meta: 'get',
  async script({ plugin }) {
    const data = await fs.readFile('/home/jena/jenasoft/dbgate-plugin-csv/lib/frontend.js', {
      encoding: 'utf-8',
    });
    return data;
  },

  search_meta: 'get',
  async search({ filter }) {
    console.log(`https://api.npms.io/v2/search?q=keywords:dbgate ${encodeURIComponent(filter)}`);
    const response = await fetch(`https://api.npms.io/v2/search?q=keywords:dbgate ${encodeURIComponent(filter)}`);
    const json = await response.json();
    console.log(json);
    const { results } = json || {};
    return results || [];
  },
};
