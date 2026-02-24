const express = require('express');
const router = express.Router();
const orders = require('../entities/orders');

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         customerId:
 *           type: integer
 *         orderNumber:
 *           type: string
 *         totalAmount:
 *           type: number
 *         status:
 *           type: string
 *         orderDate:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
router.get('/', (req, res) => {
  res.json(orders.getAll());
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 */
router.get('/:id', (req, res) => {
  const order = orders.getById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - totalAmount
 *               - status
 *             properties:
 *               customerId:
 *                 type: integer
 *               totalAmount:
 *                 type: number
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 */
router.post('/', (req, res) => {
  const order = orders.create(req.body);
  res.status(201).json(order);
});

/**
 * @swagger
 * /api/orders/{id}:
 *   put:
 *     summary: Update order by ID
 *     tags: [Orders]
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
 *               customerId:
 *                 type: integer
 *               totalAmount:
 *                 type: number
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 */
router.put('/:id', (req, res) => {
  const order = orders.update(req.params.id, req.body);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Delete order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Order deleted
 *       404:
 *         description: Order not found
 */
router.delete('/:id', (req, res) => {
  const deleted = orders.delete(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.status(204).send();
});

module.exports = router;
