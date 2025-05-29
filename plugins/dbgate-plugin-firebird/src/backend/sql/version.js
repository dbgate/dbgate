module.exports = `SELECT rdb$get_context('SYSTEM', 'ENGINE_VERSION') as version from rdb$database;`;
