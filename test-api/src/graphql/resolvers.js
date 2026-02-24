const users = require('../entities/users');
const products = require('../entities/products');
const orders = require('../entities/orders');
const categories = require('../entities/categories');
const reviews = require('../entities/reviews');
const { GraphQLError } = require('graphql');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resolvers = {
  // User queries
  users: () => users.getAll(),
  user: ({ id }) => users.getById(id),
  
  // Product queries
  products: () => products.getAll(),
  product: ({ id }) => products.getById(id),
  
  // Order queries
  orders: () => orders.getAll(),
  order: ({ id }) => orders.getById(id),
  
  // Category queries
  categories: () => categories.getAll(),
  category: ({ id }) => categories.getById(id),
  
  // Review queries
  reviews: () => reviews.getAll(),
  review: ({ id }) => reviews.getById(id),

  // Error testing queries
  errorBadRequest: () => {
    throw new GraphQLError('Bad request', {
      extensions: {
        code: 'BAD_USER_INPUT',
        http: { status: 400 },
      },
    });
  },
  errorUnauthorized: () => {
    throw new GraphQLError('Unauthorized', {
      extensions: {
        code: 'UNAUTHENTICATED',
        http: { status: 401 },
      },
    });
  },
  errorForbidden: () => {
    throw new GraphQLError('Forbidden', {
      extensions: {
        code: 'FORBIDDEN',
        http: { status: 403 },
      },
    });
  },
  errorNotFound: () => {
    throw new GraphQLError('Resource not found', {
      extensions: {
        code: 'NOT_FOUND',
        http: { status: 404 },
      },
    });
  },
  errorInternal: () => {
    throw new GraphQLError('Internal server error', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        http: { status: 500 },
      },
    });
  },
  delayed2s: async () => {
    await wait(2000);
    return 'Completed after 2 seconds';
  },
  delayed4s: async () => {
    await wait(4000);
    return 'Completed after 4 seconds';
  },
  delayed10s: async () => {
    await wait(10000);
    return 'Completed after 10 seconds';
  },
  delayed1m: async () => {
    await wait(60000);
    return 'Completed after 1 minute';
  },
  
  // User mutations
  createUser: ({ input }) => users.create(input),
  updateUser: ({ id, input }) => users.update(id, input),
  deleteUser: ({ id }) => users.delete(id),
  
  // Product mutations
  createProduct: ({ input }) => products.create(input),
  updateProduct: ({ id, input }) => products.update(id, input),
  deleteProduct: ({ id }) => products.delete(id),
  
  // Order mutations
  createOrder: ({ input }) => orders.create(input),
  updateOrder: ({ id, input }) => orders.update(id, input),
  deleteOrder: ({ id }) => orders.delete(id),
  
  // Category mutations
  createCategory: ({ input }) => categories.create(input),
  updateCategory: ({ id, input }) => categories.update(id, input),
  deleteCategory: ({ id }) => categories.delete(id),
  
  // Review mutations
  createReview: ({ input }) => reviews.create(input),
  updateReview: ({ id, input }) => reviews.update(id, input),
  deleteReview: ({ id }) => reviews.delete(id),

  delayedMutation2s: async () => {
    await wait(2000);
    return 'Mutation completed after 2 seconds';
  },
  delayedMutation4s: async () => {
    await wait(4000);
    return 'Mutation completed after 4 seconds';
  },
  delayedMutation10s: async () => {
    await wait(10000);
    return 'Mutation completed after 10 seconds';
  },
  delayedMutation1m: async () => {
    await wait(60000);
    return 'Mutation completed after 1 minute';
  },
};

module.exports = resolvers;
