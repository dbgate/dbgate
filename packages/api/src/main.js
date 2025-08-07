const express = require('express');
const basicAuth = require('express-basic-auth');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const http = require('http');
const cors = require('cors');
const getPort = require('get-port');
const path = require('path');
const fs = require('fs/promises');

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
const storage = require('./controllers/storage');
const archive = require('./controllers/archive');
const apps = require('./controllers/apps');
const auth = require('./controllers/auth');
const uploads = require('./controllers/uploads');
const plugins = require('./controllers/plugins');
const files = require('./controllers/files');
const scheduler = require('./controllers/scheduler');
const queryHistory = require('./controllers/queryHistory');
const cloud = require('./controllers/cloud');
const onFinished = require('on-finished');
const processArgs = require('./utility/processArgs');

const { rundir, filesdir } = require('./utility/directories');
const platformInfo = require('./utility/platformInfo');
const getExpressPath = require('./utility/getExpressPath');
const _ = require('lodash');
const { getLogger } = require('dbgate-tools');
const { getDefaultAuthProvider } = require('./auth/authProvider');
const startCloudUpgradeTimer = require('./utility/cloudUpgrade');
const { isProApp } = require('./utility/checkLicense');
const { getHealthStatus, getHealthStatusSprinx } = require('./utility/healthStatus');
const { startCloudFiles } = require('./utility/cloudIntf');

const logger = getLogger('main');

function registerExpressStatic(app, publicDir) {
  app.get([getExpressPath('/'), getExpressPath('/*.html')], async (req, res, next) => {
    try {
      const relPath = req.path === getExpressPath('/') ? '/index.html' : req.path;
      const filePath = path.join(publicDir, relPath);

      let html = await fs.readFile(filePath, 'utf8');

      if (process.env.DBGATE_GTM_ID) {
        html = html.replace(
          /<!--HEAD_SCRIPT-->/g,
          `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','${process.env.DBGATE_GTM_ID}');</script>
    <!-- End Google Tag Manager -->`
        );
        html = html.replace(
          /<!--BODY_SCRIPT-->/g,
          process.env.PAGE_BODY_SCRIPT ??
            `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${process.env.DBGATE_GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`
        );
      } else {
        html = html.replace(/<!--HEAD_SCRIPT-->/g, process.env.PAGE_HEAD_SCRIPT ?? '');
        html = html.replace(/<!--BODY_SCRIPT-->/g, process.env.PAGE_BODY_SCRIPT ?? '');
      }

      res.type('html').send(html);
    } catch (err) {
      if (err.code === 'ENOENT') return next();
      next(err);
    }
  });

  // 2) Static assets for everything else (css/js/images/etc.)
  app.use(getExpressPath('/'), express.static(publicDir));
}

function start() {
  // console.log('process.argv', process.argv);

  const app = express();

  const server = http.createServer(app);

  if (process.env.BASIC_AUTH && !process.env.STORAGE_DATABASE) {
    async function authorizer(username, password, cb) {
      try {
        const resp = await getDefaultAuthProvider().login(username, password);
        if (resp.accessToken) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      } catch (err) {
        cb(err, false);
      }
    }
    app.use(
      basicAuth({
        authorizer,
        authorizeAsync: true,
        challenge: true,
        realm: 'DbGate Web App',
      })
    );
  }

  app.use(cors());

  if (platformInfo.isDocker) {
    // server static files inside docker container
    registerExpressStatic(app, '/home/dbgate-docker/public');
  } else if (platformInfo.isAwsUbuntuLayout) {
    registerExpressStatic(app, '/home/dbgate-docker/public');
    registerExpressStatic(app, '/home/ubuntu/build/public');
  } else if (platformInfo.isAzureUbuntuLayout) {
    registerExpressStatic(app, '/home/azureuser/build/public');
  } else if (processArgs.runE2eTests) {
    registerExpressStatic(app, path.resolve('packer/build/public'));
  } else if (platformInfo.isNpmDist) {
    registerExpressStatic(app, path.join(__dirname, isProApp() ? '../../dbgate-web-premium/public' : '../../dbgate-web/public'));
  } else if (process.env.DEVWEB) {
    registerExpressStatic(app, path.join(__dirname, '../../web/public'));
  } else {
    app.get(getExpressPath('/'), (req, res) => {
      res.send('DbGate API');
    });
  }

  app.use(auth.authMiddleware);

  app.get(getExpressPath('/stream'), async function (req, res) {
    const strmid = req.query.strmid;
    res.set({
      'Cache-Control': 'no-cache',
      'Content-Type': 'text/event-stream',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    });
    res.flushHeaders();

    // Tell the client to retry every 10 seconds if connectivity is lost
    res.write('retry: 10000\n\n');
    socket.addSseResponse(res, strmid);
    onFinished(req, () => {
      socket.removeSseResponse(strmid);
    });
  });

  app.get(getExpressPath('/health'), async function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    const health = await getHealthStatus();
    res.end(JSON.stringify(health, null, 2));
  });

  app.get(getExpressPath('/__health'), async function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    const health = await getHealthStatusSprinx();
    res.end(JSON.stringify(health, null, 2));
  });

  app.use(bodyParser.json({ limit: '50mb' }));

  app.use(
    getExpressPath('/uploads'),
    fileUpload({
      limits: { fileSize: 4 * 1024 * 1024 },
    })
  );

  useAllControllers(app, null);

  // if (process.env.PAGES_DIRECTORY) {
  //   app.use('/pages', express.static(process.env.PAGES_DIRECTORY));
  // }

  app.use(getExpressPath('/runners/data'), express.static(rundir()));
  app.use(getExpressPath('/files/data'), express.static(filesdir()));

  if (platformInfo.isDocker) {
    const port = process.env.PORT || 3000;
    logger.info(`DBGM-00028 DbGate API listening on port ${port} (docker build)`);
    server.listen(port);
  } else if (platformInfo.isAwsUbuntuLayout) {
    const port = process.env.PORT || 3000;
    logger.info(`DBGM-00029 DbGate API listening on port ${port} (AWS AMI build)`);
    server.listen(port);
  } else if (platformInfo.isAzureUbuntuLayout) {
    const port = process.env.PORT || 3000;
    logger.info(`DBGM-00030 DbGate API listening on port ${port} (Azure VM build)`);
    server.listen(port);
  } else if (platformInfo.isNpmDist) {
    getPort({
      port: parseInt(
        // @ts-ignore
        process.env.PORT || 3000
      ),
    }).then(port => {
      server.listen(port, () => {
        logger.info(`DBGM-00031 DbGate API listening on port ${port} (NPM build)`);
      });
    });
  } else if (process.env.DEVWEB) {
    const port = process.env.PORT || 3000;
    logger.info(`DBGM-00032 DbGate API & web listening on port ${port} (dev web build)`);
    server.listen(port);
  } else {
    const port = process.env.PORT || 3000;
    logger.info(`DBGM-00033 DbGate API listening on port ${port} (dev API build)`);
    server.listen(port);
  }

  function shutdown() {
    logger.info('DBGM-00034 Shutting down DbGate API server');
    server.close(() => {
      logger.info('DBGM-00035 Server shut down, terminating');
      process.exit(0);
    });
    setTimeout(() => {
      logger.info('DBGM-00036 Server close timeout, terminating');
      process.exit(0);
    }, 1000);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('SIGBREAK', shutdown);

  if (process.env.CLOUD_UPGRADE_FILE) {
    startCloudUpgradeTimer();
  }

  startCloudFiles();
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
  useController(app, electron, '/storage', storage);
  useController(app, electron, '/archive', archive);
  useController(app, electron, '/uploads', uploads);
  useController(app, electron, '/plugins', plugins);
  useController(app, electron, '/files', files);
  useController(app, electron, '/scheduler', scheduler);
  useController(app, electron, '/query-history', queryHistory);
  useController(app, electron, '/apps', apps);
  useController(app, electron, '/auth', auth);
  useController(app, electron, '/cloud', cloud);
}

function setElectronSender(electronSender) {
  socket.setElectronSender(electronSender);
}

module.exports = { start, useAllControllers, setElectronSender, configController: config };
