const _ = require('lodash');
const express = require('express');
const getExpressPath = require('./getExpressPath');
const { MissingCredentialsError } = require('./exceptions');
const { validateRouteAccess, checkRouteAccess } = require('./routeAccess');
const { getLogger, extractErrorLogData } = require('dbgate-tools');

const logger = getLogger('useController');

function sendAccessError(res, err) {
  res.status(403).json({ apiErrorMessage: err.message });
}
/**
 * @param {string} route
 */
module.exports = function useController(app, electron, route, controller) {
  const router = express.Router();

  if (controller._init) {
    logger.info(`DBGM-00096 Calling init controller for controller ${route}`);
    try {
      controller._init();
    } catch (err) {
      logger.error(extractErrorLogData(err), `DBGM-00097 Error initializing controller, exiting application`);
      process.exit(1);
    }
  }

  for (const key of _.keys(controller)) {
    const obj = controller[key];
    if (!_.isFunction(obj)) continue;
    const meta = controller[`${key}_meta`];
    if (!meta) continue;

    const routeAction = `/${_.kebabCase(key)}`;

    if (electron) {
      if (meta === true) {
        const handler = `${route.substring(1)}-${_.kebabCase(key)}`;
        // console.log('REGISTERING HANDLER', handler);
        electron.ipcMain.handle(handler, async (event, args) => {
          try {
            const data = await controller[key](args);
            // console.log('HANDLED API', handler, data);
            if (data === undefined) return null;
            return data;
          } catch (err) {
            if (err instanceof MissingCredentialsError) {
              return {
                missingCredentials: true,
                apiErrorMessage: 'Missing credentials',
                detail: err.detail,
              };
            }
            return { apiErrorMessage: err.message };
          }
        });
      }

      continue;
    }

    // see routeAccess.js - a route without a valid declaration is refused
    // (fail closed - a route without a declaration cannot be exposed by mistake)
    const access = controller[`${key}_access`];
    if (!validateRouteAccess(access)) {
      logger.error(`DBGM-00000 Route ${route}/${key} has no valid access policy, it will be refused`);
    }

    let method = 'post';
    let raw = false;

    // if (_.isString(meta)) {
    //   method = meta;
    // }
    if (_.isPlainObject(meta)) {
      method = meta.method;
      raw = meta.raw;
    }

    if (raw) {
      router[method](routeAction, async (req, res) => {
        try {
          await checkRouteAccess(access, { ...req.body, ...req.query }, req);
        } catch (err) {
          logger.warn(`DBGM-00000 Access to route ${route}/${key} refused: ${err.message}`);
          sendAccessError(res, err);
          return;
        }
        return controller[key](req, res);
      });
    } else {
      router[method](routeAction, async (req, res) => {
        // if (controller._init && !controller._init_called) {
        //   await controller._init();
        //   controller._init_called = true;
        // }
        try {
          await checkRouteAccess(access, { ...req.body, ...req.query }, req);
        } catch (err) {
          logger.warn(`DBGM-00000 Access to route ${route}/${key} refused: ${err.message}`);
          sendAccessError(res, err);
          return;
        }
        try {
          const data = await controller[key]({ ...req.body, ...req.query }, req);
          res.json(data);
        } catch (err) {
          logger.error(extractErrorLogData(err), `DBGM-00176 Error when processing route ${route}/${key}`);
          if (err instanceof MissingCredentialsError) {
            res.json({
              missingCredentials: true,
              apiErrorMessage: 'Missing credentials',
              detail: err.detail,
            });
          } else {
            res.status(500).json({ apiErrorMessage: (_.isString(err) ? err : err.message) ?? 'Unknown error' });
          }
        }
      });
    }
  }

  if (app) {
    app.use(getExpressPath(route), router);
  }
};
