const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');
const io = require('socket.io');
const fs = require('fs');
const findFreePort = require('find-free-port');

const useController = require('./utility/useController');
const socket = require('./utility/socket');

const connections = require('./controllers/connections');
const serverConnections = require('./controllers/serverConnections');
const databaseConnections = require('./controllers/databaseConnections');
const metadata = require('./controllers/metadata');
const sessions = require('./controllers/sessions');
const jsldata = require('./controllers/jsldata');

function start(argument = null) {
  console.log('process.argv', process.argv);

  const app = express();

  const server = http.createServer(app);
  socket.set(io(server));

  app.use(cors());
  app.use(bodyParser.json());

  useController(app, '/connections', connections);
  useController(app, '/server-connections', serverConnections);
  useController(app, '/database-connections', databaseConnections);
  useController(app, '/metadata', metadata);
  useController(app, '/sessions', sessions);
  useController(app, '/jsldata', jsldata);

  if (fs.existsSync('/home/dbgate-docker/build')) {
    // server static files inside docker container
    app.use(express.static('/home/dbgate-docker/build'));
  } else {
    app.get('/', (req, res) => {
      res.send('DbGate API');
    });
  }

  if (argument == '--dynport') {
    findFreePort(53911, function (err, port) {
      server.listen(port, () => {
        console.log(`DbGate API listening on port ${port}`);
        process.send({ msgtype: 'listening', port });
      });
    });
  } else {
    server.listen(3000);
  }
}

module.exports = { start };
