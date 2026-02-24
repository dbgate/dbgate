// Users entity with in-memory storage
const users = [];
let nextId = 1;

// Helper function to generate sample data
function generateUsers(count) {
  const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const domains = ['example.com', 'test.com', 'demo.com', 'sample.org'];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    users.push({
      id: nextId++,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domains[Math.floor(Math.random() * domains.length)]}`,
      age: Math.floor(Math.random() * 50) + 18,
      active: Math.random() > 0.3,
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString()
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
