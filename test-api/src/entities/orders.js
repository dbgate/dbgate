// Orders entity with in-memory storage
const orders = [];
let nextId = 1;

// Helper function to generate sample data (deterministic, no randomness)
function generateOrders(count) {
  const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  for (let i = 0; i < count; i++) {
    orders.push({
      id: nextId++,
      customerId: (i * 7 + 3) % 200 + 1,
      orderNumber: `ORD-${String(i + 1).padStart(8, '0')}`,
      totalAmount: parseFloat(((i * 97 + 23) % 5000 + 50).toFixed(2)),
      status: statuses[i % statuses.length],
      orderDate: new Date(1700000000000 - i * 3600000 * 24).toISOString()
    });
  }
}

// Prefill with 50 orders
generateOrders(50);

module.exports = {
  getAll: () => orders,
  getById: (id) => orders.find(o => o.id === parseInt(id)),
  create: (data) => {
    const order = { 
      id: nextId++, 
      ...data, 
      orderDate: new Date().toISOString(),
      orderNumber: `ORD-${String(nextId).padStart(8, '0')}`
    };
    orders.push(order);
    return order;
  },
  update: (id, data) => {
    const index = orders.findIndex(o => o.id === parseInt(id));
    if (index === -1) return null;
    orders[index] = { ...orders[index], ...data, id: parseInt(id) };
    return orders[index];
  },
  delete: (id) => {
    const index = orders.findIndex(o => o.id === parseInt(id));
    if (index === -1) return false;
    orders.splice(index, 1);
    return true;
  }
};
