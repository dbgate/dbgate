const connections = require('../controllers/connections');

function registerVolatileConnections(conns) {
  connections.registerVolatileConnections(conns);
}

module.exports = registerVolatileConnections;
