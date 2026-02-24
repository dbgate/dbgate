// Reviews entity with in-memory storage
const reviews = [];
let nextId = 1;

// Helper function to generate sample data
function generateReviews(count) {
  const reviewTexts = [
    'Great product, highly recommended!',
    'Good quality for the price.',
    'Not what I expected, but okay.',
    'Excellent! Will buy again.',
    'Poor quality, disappointed.',
    'Amazing product! Exceeded expectations.',
    'Average product, nothing special.',
    'Very satisfied with this purchase.',
    'Could be better, but it works.',
    'Outstanding quality and service!'
  ];
  
  for (let i = 0; i < count; i++) {
    reviews.push({
      id: nextId++,
      productId: Math.floor(Math.random() * 200) + 1,
      userId: Math.floor(Math.random() * 200) + 1,
      rating: Math.floor(Math.random() * 5) + 1,
      title: `Review ${i + 1}`,
      comment: reviewTexts[Math.floor(Math.random() * reviewTexts.length)],
      verified: Math.random() > 0.3,
      helpfulCount: Math.floor(Math.random() * 100),
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString()
    });
  }
}

// Prefill with 100 reviews
generateReviews(100);

module.exports = {
  getAll: () => reviews,
  getById: (id) => reviews.find(r => r.id === parseInt(id)),
  create: (data) => {
    const review = { id: nextId++, ...data, createdAt: new Date().toISOString() };
    reviews.push(review);
    return review;
  },
  update: (id, data) => {
    const index = reviews.findIndex(r => r.id === parseInt(id));
    if (index === -1) return null;
    reviews[index] = { ...reviews[index], ...data, id: parseInt(id) };
    return reviews[index];
  },
  delete: (id) => {
    const index = reviews.findIndex(r => r.id === parseInt(id));
    if (index === -1) return false;
    reviews.splice(index, 1);
    return true;
  }
};
