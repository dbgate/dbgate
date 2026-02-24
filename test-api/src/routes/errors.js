const express = require('express');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *         code:
 *           type: string
 *         details:
 *           type: object
 */

/**
 * @swagger
 * /api/errors/bad-request:
 *   get:
 *     summary: Return 400 Bad Request
 *     tags: [Error Testing]
 *     responses:
 *       400:
 *         description: Bad request error
 */
router.get('/bad-request', (req, res) => {
  res.status(400).json({
    error: 'Bad request',
    code: 'BAD_REQUEST',
    details: { reason: 'Simulated invalid input' },
  });
});

/**
 * @swagger
 * /api/errors/unauthorized:
 *   get:
 *     summary: Return 401 Unauthorized
 *     tags: [Error Testing]
 *     responses:
 *       401:
 *         description: Unauthorized error
 */
router.get('/unauthorized', (req, res) => {
  res.status(401).json({
    error: 'Unauthorized',
    code: 'UNAUTHORIZED',
  });
});

/**
 * @swagger
 * /api/errors/forbidden:
 *   get:
 *     summary: Return 403 Forbidden
 *     tags: [Error Testing]
 *     responses:
 *       403:
 *         description: Forbidden error
 */
router.get('/forbidden', (req, res) => {
  res.status(403).json({
    error: 'Forbidden',
    code: 'FORBIDDEN',
  });
});

/**
 * @swagger
 * /api/errors/not-found:
 *   get:
 *     summary: Return 404 Not Found
 *     tags: [Error Testing]
 *     responses:
 *       404:
 *         description: Not found error
 */
router.get('/not-found', (req, res) => {
  res.status(404).json({
    error: 'Resource not found',
    code: 'NOT_FOUND',
  });
});

/**
 * @swagger
 * /api/errors/conflict:
 *   get:
 *     summary: Return 409 Conflict
 *     tags: [Error Testing]
 *     responses:
 *       409:
 *         description: Conflict error
 */
router.get('/conflict', (req, res) => {
  res.status(409).json({
    error: 'Conflict',
    code: 'CONFLICT',
  });
});

/**
 * @swagger
 * /api/errors/unprocessable:
 *   get:
 *     summary: Return 422 Unprocessable Entity
 *     tags: [Error Testing]
 *     responses:
 *       422:
 *         description: Validation error
 */
router.get('/unprocessable', (req, res) => {
  res.status(422).json({
    error: 'Validation failed',
    code: 'UNPROCESSABLE_ENTITY',
    details: { field: 'email', message: 'Invalid email format' },
  });
});

/**
 * @swagger
 * /api/errors/rate-limit:
 *   get:
 *     summary: Return 429 Too Many Requests
 *     tags: [Error Testing]
 *     responses:
 *       429:
 *         description: Rate limit error
 */
router.get('/rate-limit', (req, res) => {
  res.setHeader('Retry-After', '60');
  res.status(429).json({
    error: 'Too many requests',
    code: 'RATE_LIMITED',
  });
});

/**
 * @swagger
 * /api/errors/internal:
 *   get:
 *     summary: Return 500 Internal Server Error
 *     tags: [Error Testing]
 *     responses:
 *       500:
 *         description: Internal server error
 */
router.get('/internal', (req, res) => {
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  });
});

/**
 * @swagger
 * /api/errors/unavailable:
 *   get:
 *     summary: Return 503 Service Unavailable
 *     tags: [Error Testing]
 *     responses:
 *       503:
 *         description: Service unavailable error
 */
router.get('/unavailable', (req, res) => {
  res.status(503).json({
    error: 'Service unavailable',
    code: 'SERVICE_UNAVAILABLE',
  });
});

module.exports = router;
