const { buildSchema } = require('graphql');

const schema = buildSchema(`
  type User {
    id: Int!
    firstName: String!
    lastName: String!
    email: String!
    age: Int
    active: Boolean
    createdAt: String
  }

  type Product {
    id: Int!
    name: String!
    description: String
    price: Float!
    category: String
    inStock: Boolean
    quantity: Int
    sku: String
    createdAt: String
  }

  type Order {
    id: Int!
    customerId: Int!
    orderNumber: String!
    totalAmount: Float!
    status: String!
    orderDate: String
  }

  type Category {
    id: Int!
    name: String!
    slug: String!
    description: String
    parentId: Int
    active: Boolean
    displayOrder: Int
  }

  type Review {
    id: Int!
    productId: Int!
    userId: Int!
    rating: Int!
    title: String
    comment: String
    verified: Boolean
    helpfulCount: Int
    createdAt: String
  }

  input UserInput {
    firstName: String!
    lastName: String!
    email: String!
    age: Int
    active: Boolean
  }

  input ProductInput {
    name: String!
    description: String
    price: Float!
    category: String
    inStock: Boolean
    quantity: Int
    sku: String
  }

  input OrderInput {
    customerId: Int!
    totalAmount: Float!
    status: String!
  }

  input CategoryInput {
    name: String!
    slug: String!
    description: String
    parentId: Int
    active: Boolean
    displayOrder: Int
  }

  input ReviewInput {
    productId: Int!
    userId: Int!
    rating: Int!
    title: String
    comment: String
    verified: Boolean
    helpfulCount: Int
  }

  type Query {
    users: [User!]!
    user(id: Int!): User
    products: [Product!]!
    product(id: Int!): Product
    orders: [Order!]!
    order(id: Int!): Order
    categories: [Category!]!
    category(id: Int!): Category
    reviews: [Review!]!
    review(id: Int!): Review
    errorBadRequest: String
    errorUnauthorized: String
    errorForbidden: String
    errorNotFound: String
    errorInternal: String
    delayed2s: String!
    delayed4s: String!
    delayed10s: String!
    delayed1m: String!
  }

  type Mutation {
    createUser(input: UserInput!): User!
    updateUser(id: Int!, input: UserInput!): User
    deleteUser(id: Int!): Boolean!
    
    createProduct(input: ProductInput!): Product!
    updateProduct(id: Int!, input: ProductInput!): Product
    deleteProduct(id: Int!): Boolean!
    
    createOrder(input: OrderInput!): Order!
    updateOrder(id: Int!, input: OrderInput!): Order
    deleteOrder(id: Int!): Boolean!
    
    createCategory(input: CategoryInput!): Category!
    updateCategory(id: Int!, input: CategoryInput!): Category
    deleteCategory(id: Int!): Boolean!
    
    createReview(input: ReviewInput!): Review!
    updateReview(id: Int!, input: ReviewInput!): Review
    deleteReview(id: Int!): Boolean!

    delayedMutation2s: String!
    delayedMutation4s: String!
    delayedMutation10s: String!
    delayedMutation1m: String!
  }
`);

module.exports = schema;
