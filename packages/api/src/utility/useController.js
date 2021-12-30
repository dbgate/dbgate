const _ = require('lodash');
const express = require('express');

/**
 * @param {string} route
 */
module.exports = function useController(app, electron, route, controller) {
  const router = express.Router();

  if (controller._init) {
    console.log(`Calling init controller for controller ${route}`);
    try {
      controller._init();
    } catch (err) {
      console.log(`Error initializing controller, exiting application`, err);
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
          const data = await controller[key](args);
          // console.log('HANDLED API', handler, data);
          return data;
        });
      }

      continue;
    }

    let method = 'post';
    let raw = false;
    let rawParams = false;

    // if (_.isString(meta)) {
    //   method = meta;
    // }
    if (_.isPlainObject(meta)) {
      method = meta.method;
      raw = meta.raw;
      rawParams = meta.rawParams;
    }

    if (raw) {
      router[method](routeAction, controller[key]);
    } else {
      router[method](routeAction, async (req, res) => {
        // if (controller._init && !controller._init_called) {
        //   await controller._init();
        //   controller._init_called = true;
        // }
        try {
          let params = [{ ...req.body, ...req.query }];
          if (rawParams) params = [req, res];
          const data = await controller[key](...params);
          res.json(data);
        } catch (e) {
          console.log(e);
          res.status(500).json({ error: e.message });
        }
      });
    }
  }

  if (app) {
    app.use(route, router);
  }
};
