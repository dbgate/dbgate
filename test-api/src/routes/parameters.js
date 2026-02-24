const express = require('express');
const router = express.Router();

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    return value.split(',');
  }

  return [];
}

function extractCookies(req) {
  const cookieHeader = req.headers.cookie || '';
  const result = {};

  cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const [name, ...rest] = pair.split('=');
      result[name] = rest.join('=');
    });

  return result;
}

/**
 * @swagger
 * components:
 *   schemas:
 *     SearchRequest:
 *       type: object
 *       required:
 *         - query
 *       properties:
 *         query:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         filters:
 *           type: object
 *           additionalProperties:
 *             type: string
 *     UploadMeta:
 *       type: object
 *       properties:
 *         description:
 *           type: string
 *         category:
 *           type: string
 *     ParameterEchoResponse:
 *       type: object
 *       properties:
 *         endpoint:
 *           type: string
 *         received:
 *           type: object
 */

/**
 * @swagger
 * /api/params/path/{entityId}/detail/{detailId}:
 *   get:
 *     summary: Path parameters example
 *     tags: [Parameters]
 *     parameters:
 *       - in: path
 *         name: entityId
 *         required: true
 *         description: Entity ID in path
 *         schema:
 *           type: integer
 *       - in: path
 *         name: detailId
 *         required: true
 *         description: Detail identifier in path
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Echo of path parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParameterEchoResponse'
 */
router.get('/path/:entityId/detail/:detailId', (req, res) => {
  res.json({
    endpoint: 'path',
    received: {
      entityId: Number(req.params.entityId),
      detailId: req.params.detailId,
    },
  });
});

/**
 * @swagger
 * /api/params/query:
 *   get:
 *     summary: Query parameters example (primitive, array, object)
 *     tags: [Parameters]
 *     parameters:
 *       - in: query
 *         name: search
 *         description: Full-text search value
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         description: Page number
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: tags
 *         description: Repeated array style (?tags=a&tags=b)
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: true
 *       - in: query
 *         name: fields
 *         description: CSV array style (?fields=id,name)
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         style: form
 *         explode: false
 *       - in: query
 *         name: filter
 *         description: Deep object style (?filter[status]=active&filter[minPrice]=10)
 *         schema:
 *           type: object
 *           additionalProperties:
 *             type: string
 *         style: deepObject
 *         explode: true
 *     responses:
 *       200:
 *         description: Echo of query parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParameterEchoResponse'
 */
router.get('/query', (req, res) => {
  res.json({
    endpoint: 'query',
    received: {
      search: req.query.search,
      page: req.query.page ? Number(req.query.page) : undefined,
      tags: normalizeArray(req.query.tags),
      fields: normalizeArray(req.query.fields),
      filter: req.query.filter || {},
      rawQuery: req.query,
    },
  });
});

/**
 * @swagger
 * /api/params/header:
 *   get:
 *     summary: Header parameters example
 *     tags: [Parameters]
 *     parameters:
 *       - in: header
 *         name: x-trace-id
 *         required: false
 *         description: Correlation ID
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-client-version
 *         required: false
 *         description: Client app version
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Echo of header parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParameterEchoResponse'
 */
router.get('/header', (req, res) => {
  res.json({
    endpoint: 'header',
    received: {
      traceId: req.headers['x-trace-id'],
      clientVersion: req.headers['x-client-version'],
    },
  });
});

/**
 * @swagger
 * /api/params/cookie:
 *   get:
 *     summary: Cookie parameters example
 *     tags: [Parameters]
 *     parameters:
 *       - in: cookie
 *         name: sessionId
 *         required: false
 *         schema:
 *           type: string
 *       - in: cookie
 *         name: tenant
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Echo of cookie parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParameterEchoResponse'
 */
router.get('/cookie', (req, res) => {
  const cookies = extractCookies(req);

  res.json({
    endpoint: 'cookie',
    received: {
      sessionId: cookies.sessionId,
      tenant: cookies.tenant,
      allCookies: cookies,
    },
  });
});

/**
 * @swagger
 * /api/params/body/json:
 *   post:
 *     summary: JSON request body example
 *     tags: [Parameters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchRequest'
 *     responses:
 *       200:
 *         description: Echo of JSON body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParameterEchoResponse'
 */
router.post('/body/json', (req, res) => {
  res.json({
    endpoint: 'body-json',
    received: req.body,
  });
});

/**
 * @swagger
 * /api/params/body/form:
 *   post:
 *     summary: Form URL-encoded request body example
 *     tags: [Parameters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               count:
 *                 type: integer
 *               enabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Echo of form body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParameterEchoResponse'
 */
router.post('/body/form', (req, res) => {
  res.json({
    endpoint: 'body-form',
    received: req.body,
  });
});

/**
 * @swagger
 * /api/params/body/mixed/{id}:
 *   post:
 *     summary: Mixed parameters example (path + query + header + cookie + body)
 *     tags: [Parameters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: dryRun
 *         required: false
 *         schema:
 *           type: boolean
 *       - in: header
 *         name: x-correlation-id
 *         required: false
 *         schema:
 *           type: string
 *       - in: cookie
 *         name: locale
 *         required: false
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *               amount:
 *                 type: number
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               metadata:
 *                 $ref: '#/components/schemas/UploadMeta'
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Echo of mixed inputs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ParameterEchoResponse'
 */
router.post('/body/mixed/:id', (req, res) => {
  const cookies = extractCookies(req);

  res.json({
    endpoint: 'body-mixed',
    received: {
      path: {
        id: Number(req.params.id),
      },
      query: {
        dryRun: req.query.dryRun,
      },
      header: {
        correlationId: req.headers['x-correlation-id'],
      },
      cookie: {
        locale: cookies.locale,
      },
      body: req.body,
      contentType: req.headers['content-type'],
      note: 'multipart/form-data shape is documented in OpenAPI; this test endpoint echoes parsed body when available.',
    },
  });
});

module.exports = router;
