// Products entity with in-memory storage
const products = [];
let nextId = 1;

// Helper function to generate sample data
function generateProducts(count) {
  const categories = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports', 'Toys'];
  const adjectives = ['Premium', 'Deluxe', 'Standard', 'Basic', 'Pro', 'Ultra'];
  const nouns = ['Widget', 'Gadget', 'Tool', 'Device', 'Item', 'Product'];
  
  for (let i = 0; i < count; i++) {
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    products.push({
      id: nextId++,
      name: `${adjective} ${noun} ${i + 1}`,
      description: `This is a high-quality ${adjective.toLowerCase()} ${noun.toLowerCase()} for your needs.`,
      price: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
      category: categories[Math.floor(Math.random() * categories.length)],
      inStock: Math.random() > 0.2,
      quantity: Math.floor(Math.random() * 500),
      sku: `SKU-${String(i + 1).padStart(6, '0')}`,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString()
    });
  }
}

// Prefill with 200 products
generateProducts(200);

module.exports = {
  getAll: () => products,
  getById: (id) => products.find(p => p.id === parseInt(id)),
  create: (data) => {
    const product = { id: nextId++, ...data, createdAt: new Date().toISOString() };
    products.push(product);
    return product;
  },
  update: (id, data) => {
    const index = products.findIndex(p => p.id === parseInt(id));
    if (index === -1) return null;
    products[index] = { ...products[index], ...data, id: parseInt(id) };
    return products[index];
  },
  delete: (id) => {
    const index = products.findIndex(p => p.id === parseInt(id));
    if (index === -1) return false;
    products.splice(index, 1);
    return true;
  }
};
