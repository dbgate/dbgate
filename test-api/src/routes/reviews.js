const express = require('express');
const router = express.Router();
const reviews = require('../entities/reviews');

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         productId:
 *           type: integer
 *         userId:
 *           type: integer
 *         rating:
 *           type: integer
 *         title:
 *           type: string
 *         comment:
 *           type: string
 *         verified:
 *           type: boolean
 *         helpfulCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get all reviews
 *     tags: [Reviews]
 *     responses:
 *       200:
 *         description: List of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 */
router.get('/', (req, res) => {
  res.json(reviews.getAll());
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Get review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Review found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       404:
 *         description: Review not found
 */
router.get('/:id', (req, res) => {
  const review = reviews.getById(req.params.id);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  res.json(review);
});

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new review
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - userId
 *               - rating
 *             properties:
 *               productId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *               rating:
 *                 type: integer
 *               title:
 *                 type: string
 *               comment:
 *                 type: string
 *               verified:
 *                 type: boolean
 *               helpfulCount:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Review created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 */
router.post('/', (req, res) => {
  const review = reviews.create(req.body);
  res.status(201).json(review);
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Update review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: integer
 *               userId:
 *                 type: integer
 *               rating:
 *                 type: integer
 *               title:
 *                 type: string
 *               comment:
 *                 type: string
 *               verified:
 *                 type: boolean
 *               helpfulCount:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Review updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       404:
 *         description: Review not found
 */
router.put('/:id', (req, res) => {
  const review = reviews.update(req.params.id, req.body);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  res.json(review);
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Review deleted
 *       404:
 *         description: Review not found
 */
router.delete('/:id', (req, res) => {
  const deleted = reviews.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Review not found' });
  }
  res.status(204).send();
});

module.exports = router;
