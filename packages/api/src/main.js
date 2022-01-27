const express = require('express');
const basicAuth = require('express-basic-auth');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const http = require('http');
const cors = require('cors');
const getPort = require('get-port');
const path = require('path');

const useController = require('./utility/useController');
const socket = require('./utility/socket');

const connections = require('./controllers/connections');
const serverConnections = require('./controllers/serverConnections');
const databaseConnections = require('./controllers/databaseConnections');
const metadata = require('./controllers/metadata');
const sessions = require('./controllers/sessions');
const runners = require('./controllers/runners');
const jsldata = require('./controllers/jsldata');
const config = require('./controllers/config');
const archive = require('./controllers/archive');
const apps = require('./controllers/apps');
const uploads = require('./controllers/uploads');
const plugins = require('./controllers/plugins');
const files = require('./controllers/files');
const scheduler = require('./controllers/scheduler');
const queryHistory = require('./controllers/queryHistory');

const { rundir } = require('./utility/directories');
const platformInfo = require('./utility/platformInfo');

let checkLocalhostOrigin = null;

function start() {
  // console.log('process.argv', process.argv);

  const app = express();

  const server = http.createServer(app);

  if (process.env.LOGIN && process.env.PASSWORD) {
    app.use(
      basicAuth({
        users: {
          [process.env.LOGIN]: process.env.PASSWORD,
        },
        challenge: true,
        realm: 'DbGate Web App',
      })
    );
  }

  app.use(function (req, res, next) {
    if (checkLocalhostOrigin) {
      if (
        req.headers.origin &&
        req.headers.origin != checkLocalhostOrigin &&
        req.headers.origin != `http://${checkLocalhostOrigin}`
      ) {
        console.log('API origin check FAILED');
        console.log('HEADERS', { ...req.headers, authorization: '***' });
        return res.status(403).json({ error: 'Not authorized!' });
      }
      if (!req.headers.origin && req.headers.host != checkLocalhostOrigin) {
        console.log('API host check FAILED');
        console.log('HEADERS', { ...req.headers, authorization: '***' });
        return res.status(403).json({ error: 'Not authorized!' });
      }
    }
    next();
  });

  app.use(cors());

  app.get('/stream', async function (req, res) {
    res.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
    });
    res.flushHeaders();

    // Tell the client to retry every 10 seconds if connectivity is lost
    res.write('retry: 10000\n\n');
    socket.setSseResponse(res);
  });

  app.use(bodyParser.json({ limit: '50mb' }));

  app.use(
    '/uploads',
    fileUpload({
      limits: { fileSize: 4 * 1024 * 1024 },
    })
  );

  useAllControllers(app, null);

  // if (process.env.PAGES_DIRECTORY) {
  //   app.use('/pages', express.static(process.env.PAGES_DIRECTORY));
  // }

  app.use('/runners/data', express.static(rundir()));

  if (platformInfo.isDocker) {
    // server static files inside docker container
    app.use(express.static('/home/dbgate-docker/public'));
  } else {
    if (!platformInfo.isNpmDist) {
      app.get('/', (req, res) => {
        res.send('DbGate API');
      });
    }
  }

  if (platformInfo.isNpmDist) {
    app.use(express.static(path.join(__dirname, '../../dbgate-web/public')));
    getPort({ port: 5000 }).then(port => {
      server.listen(port, () => {
        console.log(`DbGate API listening on port ${port}`);
      });
    });
  } else {
    const port = process.env.PORT || 3000;
    console.log('DbGate API listening on port', port);
    server.listen(port);
  }

  function shutdown() {
    console.log('\nShutting down DbGate API server');
    server.close(() => {
      console.log('Server shut down, terminating');
      process.exit(0);
    });
    setTimeout(() => {
      console.log('Server close timeout, terminating');
      process.exit(0);
    }, 1000);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGBREAK', shutdown);
}

function useAllControllers(app, electron) {
  useController(app, electron, '/connections', connections);
  useController(app, electron, '/server-connections', serverConnections);
  useController(app, electron, '/database-connections', databaseConnections);
  useController(app, electron, '/metadata', metadata);
  useController(app, electron, '/sessions', sessions);
  useController(app, electron, '/runners', runners);
  useController(app, electron, '/jsldata', jsldata);
  useController(app, electron, '/config', config);
  useController(app, electron, '/archive', archive);
  useController(app, electron, '/uploads', uploads);
  useController(app, electron, '/plugins', plugins);
  useController(app, electron, '/files', files);
  useController(app, electron, '/scheduler', scheduler);
  useController(app, electron, '/query-history', queryHistory);
  useController(app, electron, '/apps', apps);
}

function initializeElectronSender(electronSender) {
  socket.setElectronSender(electronSender);
}

module.exports = { start, useAllControllers, initializeElectronSender };
