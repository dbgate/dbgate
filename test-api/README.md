# dbgate-test-api

Testing API server with OpenAPI/Swagger and GraphQL support for E2E testing.

## Features

- 🚀 RESTful API with full CRUD operations
- 📚 Swagger UI for API documentation and testing
- 🔍 GraphQL API with custom query interface
- 💾 In-memory data storage
- 🎲 Pre-filled sample data for immediate testing

## Entities

The API provides 5 entities with comprehensive attributes:

1. **Users** (200 records) - firstName, lastName, email, age, active, createdAt
2. **Products** (200 records) - name, description, price, category, inStock, quantity, sku, createdAt
3. **Orders** (50 records) - customerId, orderNumber, totalAmount, status, orderDate
4. **Categories** (28 records) - name, slug, description, parentId, active, displayOrder
5. **Reviews** (100 records) - productId, userId, rating, title, comment, verified, helpfulCount, createdAt

## Installation

```bash
npm install
```

## Usage

Start the server:

```bash
npm start
```

The server will run on `http://localhost:3000` (or the port specified in PORT environment variable).

## API Endpoints

### REST API
- **Users**: `/api/users`
- **Products**: `/api/products`
- **Orders**: `/api/orders`
- **Categories**: `/api/categories`
- **Reviews**: `/api/reviews`

Each endpoint supports:
- `GET /api/{entity}` - Get all records
- `GET /api/{entity}/{id}` - Get single record
- `POST /api/{entity}` - Create new record
- `PUT /api/{entity}/{id}` - Update record
- `DELETE /api/{entity}/{id}` - Delete record

### Documentation & Testing

- **Swagger UI**: [http://localhost:3000/openapi/docs](http://localhost:3000/openapi/docs)
- **OpenAPI JSON**: [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json)
- **GraphQL Endpoint**: [http://localhost:3000/graphql](http://localhost:3000/graphql)
- **GraphQL Interface**: [http://localhost:3000/graphiql](http://localhost:3000/graphiql)

## Example Requests

### REST API

```bash
# Get all users
curl http://localhost:3000/api/users

# Get user by ID
curl http://localhost:3000/api/users/1

# Create a new user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","lastName":"Doe","email":"john@example.com","age":30}'

# Update a user
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"age":31}'

# Delete a user
curl -X DELETE http://localhost:3000/api/users/1
```

### GraphQL API

```bash
# Query all users
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ users { id firstName lastName email } }"}'

# Query single user
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ user(id: 1) { id firstName lastName email age } }"}'

# Create user mutation
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { createUser(input: {firstName: \"John\", lastName: \"Doe\", email: \"john@example.com\", age: 30}) { id firstName lastName } }"}'
```

## GraphQL Schema

### Queries
- `users` - Get all users
- `user(id: Int!)` - Get user by ID
- `products` - Get all products
- `product(id: Int!)` - Get product by ID
- `orders` - Get all orders
- `order(id: Int!)` - Get order by ID
- `categories` - Get all categories
- `category(id: Int!)` - Get category by ID
- `reviews` - Get all reviews
- `review(id: Int!)` - Get review by ID

### Mutations
- `createUser(input: UserInput!)` - Create user
- `updateUser(id: Int!, input: UserInput!)` - Update user
- `deleteUser(id: Int!)` - Delete user
- And similar mutations for products, orders, categories, and reviews

## Use in E2E Tests

This API is designed to be used in automated E2E tests:

```javascript
// Example using fetch in tests
const response = await fetch('http://localhost:3000/api/users');
const users = await response.json();
expect(users).toHaveLength(200);
```

## License

ISC
