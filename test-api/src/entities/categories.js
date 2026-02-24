// Categories entity with in-memory storage
const categories = [];
let nextId = 1;

// Helper function to generate sample data
function generateCategories(count) {
  const categoryNames = [
    'Electronics', 'Computers', 'Mobile Phones', 'Cameras',
    'Clothing', 'Men\'s Fashion', 'Women\'s Fashion', 'Kids Fashion',
    'Books', 'Fiction', 'Non-Fiction', 'Educational',
    'Home & Garden', 'Furniture', 'Kitchen', 'Decor',
    'Sports', 'Fitness', 'Outdoor', 'Team Sports',
    'Toys', 'Action Figures', 'Board Games', 'Puzzles',
    'Automotive', 'Parts', 'Accessories', 'Tools'
  ];
  
  for (let i = 0; i < Math.min(count, categoryNames.length); i++) {
    categories.push({
      id: nextId++,
      name: categoryNames[i],
      slug: categoryNames[i].toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: `Category for ${categoryNames[i]} products`,
      parentId: i > 3 ? Math.floor(Math.random() * 4) + 1 : null,
      active: Math.random() > 0.1,
      displayOrder: i + 1
    });
  }
}

// Prefill with 28 categories
generateCategories(28);

module.exports = {
  getAll: () => categories,
  getById: (id) => categories.find(c => c.id === parseInt(id)),
  create: (data) => {
    const category = { id: nextId++, ...data };
    categories.push(category);
    return category;
  },
  update: (id, data) => {
    const index = categories.findIndex(c => c.id === parseInt(id));
    if (index === -1) return null;
    categories[index] = { ...categories[index], ...data, id: parseInt(id) };
    return categories[index];
  },
  delete: (id) => {
    const index = categories.findIndex(c => c.id === parseInt(id));
    if (index === -1) return false;
    categories.splice(index, 1);
    return true;
  }
};
