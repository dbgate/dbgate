// Users entity with in-memory storage
const users = [];
let nextId = 1;

// Helper function to generate sample data (deterministic, no randomness)
function generateUsers(count) {
  const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const domains = ['example.com', 'test.com', 'demo.com', 'sample.org'];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    users.push({
      id: nextId++,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domains[i % domains.length]}`,
      age: (i % 50) + 18,
      active: i % 4 !== 0,
      createdAt: new Date(1700000000000 - i * 86400000).toISOString()
    });
  }
}

// Prefill with 200 users
generateUsers(200);

module.exports = {
  getAll: () => users,
  getById: (id) => users.find(u => u.id === parseInt(id)),
  create: (data) => {
    const user = { id: nextId++, ...data, createdAt: new Date().toISOString() };
    users.push(user);
    return user;
  },
  update: (id, data) => {
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return null;
    users[index] = { ...users[index], ...data, id: parseInt(id) };
    return users[index];
  },
  delete: (id) => {
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return false;
    users.splice(index, 1);
    return true;
  }
};
