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
      productId: (i * 11 + 1) % 200 + 1,
      userId: (i * 13 + 5) % 200 + 1,
      rating: (i % 5) + 1,
      title: `Review ${i + 1}`,
      comment: reviewTexts[i % reviewTexts.length],
      verified: i % 4 !== 0,
      helpfulCount: (i * 7 + 3) % 100,
      createdAt: new Date(1700000000000 - i * 86400000).toISOString()
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
