const _ = require('lodash');
const express = require('express');
const getExpressPath = require('./getExpressPath');
const { MissingCredentialsError } = require('./exceptions');
const { getLogger, extractErrorLogData } = require('dbgate-tools');

const logger = getLogger('useController');
/**
 * @param {string} route
 */
module.exports = function useController(app, electron, route, controller) {
  const router = express.Router();

  if (controller._init) {
    logger.info(`Calling init controller for controller ${route}`);
    try {
      controller._init();
    } catch (err) {
      logger.error(extractErrorLogData(err), `Error initializing controller, exiting application`);
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
      router[method](routeAction, (req, res) => controller[key](req, res));
    } else {
      router[method](routeAction, async (req, res) => {
        // if (controller._init && !controller._init_called) {
        //   await controller._init();
        //   controller._init_called = true;
        // }
        try {
          const data = await controller[key]({ ...req.body, ...req.query }, req);
          res.json(data);
        } catch (err) {
          logger.error(extractErrorLogData(err), `Error when processing route ${route}/${key}`);
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
