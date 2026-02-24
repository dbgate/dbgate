const express = require('express');
const router = express.Router();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runDelay(req, res, ms, label) {
  const startedAt = new Date().toISOString();
  await wait(ms);

  res.json({
    endpoint: `delay-${label}`,
    durationMs: ms,
    startedAt,
    finishedAt: new Date().toISOString(),
    message: `Completed after ${label}`,
  });
}

/**
 * @swagger
 * components:
 *   schemas:
 *     DelayResponse:
 *       type: object
 *       properties:
 *         endpoint:
 *           type: string
 *         durationMs:
 *           type: integer
 *         startedAt:
 *           type: string
 *           format: date-time
 *         finishedAt:
 *           type: string
 *           format: date-time
 *         message:
 *           type: string
 */

/**
 * @swagger
 * /api/delays/2s:
 *   get:
 *     summary: Delayed operation (2 seconds)
 *     tags: [Delays]
 *     responses:
 *       200:
 *         description: Completed after 2 seconds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DelayResponse'
 */
router.get('/2s', async (req, res) => {
  await runDelay(req, res, 2000, '2s');
});

/**
 * @swagger
 * /api/delays/4s:
 *   get:
 *     summary: Delayed operation (4 seconds)
 *     tags: [Delays]
 *     responses:
 *       200:
 *         description: Completed after 4 seconds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DelayResponse'
 */
router.get('/4s', async (req, res) => {
  await runDelay(req, res, 4000, '4s');
});

/**
 * @swagger
 * /api/delays/10s:
 *   get:
 *     summary: Delayed operation (10 seconds)
 *     tags: [Delays]
 *     responses:
 *       200:
 *         description: Completed after 10 seconds
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DelayResponse'
 */
router.get('/10s', async (req, res) => {
  await runDelay(req, res, 10000, '10s');
});

/**
 * @swagger
 * /api/delays/1m:
 *   get:
 *     summary: Delayed operation (1 minute)
 *     tags: [Delays]
 *     responses:
 *       200:
 *         description: Completed after 1 minute
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DelayResponse'
 */
router.get('/1m', async (req, res) => {
  await runDelay(req, res, 60000, '1m');
});

module.exports = router;
