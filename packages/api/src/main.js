const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');
const io = require('socket.io');
const fs = require('fs');

const useController = require('./utility/useController');
const connections = require('./controllers/connections');
const serverConnections = require('./controllers/serverConnections');
const databaseConnections = require('./controllers/databaseConnections');
const tables = require('./controllers/tables');
const socket = require('./utility/socket');

function start() {
  console.log('process.argv', process.argv);

  const app = express();

  const server = http.createServer(app);
  socket.set(io(server));

  app.use(cors());
  app.use(bodyParser.json());

  useController(app, '/connections', connections);
  useController(app, '/server-connections', serverConnections);
  useController(app, '/database-connections', databaseConnections);
  useController(app, '/tables', tables);

  if (fs.existsSync('/home/dbgate-docker/build')) {
    // server static files inside docker container
    app.use(express.static('/home/dbgate-docker/build'));
  } else {
    app.get('/', (req, res) => {
      res.send('DbGate API');
    });
  }

  server.listen(3000);
}

module.exports = { start };
