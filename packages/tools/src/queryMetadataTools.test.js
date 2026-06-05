'use strict';

const {
  extractColumnMetadataFromSql,
  extractColumnSourcesFromSql,
  extractSingleTableFromSql,
  isSimpleSelectQuery,
} = require('./queryMetadataTools');

describe('queryMetadataTools', () => {
  describe('simple SELECT detection', () => {
    test('accepts simple single-table SELECT star', () => {
      expect(isSimpleSelectQuery('SELECT * FROM users')).toBe(true);
      expect(extractSingleTableFromSql('SELECT * FROM users')).toEqual({ tableName: 'users' });
    });

    test('accepts schema-qualified single-table SELECT', () => {
      expect(extractSingleTableFromSql('SELECT id, name FROM public.users WHERE id > 10')).toEqual({
        schemaName: 'public',
        tableName: 'users',
      });
    });

    test('accepts quoted identifiers', () => {
      expect(extractSingleTableFromSql('SELECT "id", "name" FROM "public"."users"')).toEqual({
        schemaName: 'public',
        tableName: 'users',
      });
      expect(extractSingleTableFromSql('SELECT [id] FROM [dbo].[Users]')).toEqual({
        schemaName: 'dbo',
        tableName: 'Users',
      });
      expect(extractSingleTableFromSql('SELECT `id` FROM `main`.`users`')).toEqual({
        schemaName: 'main',
        tableName: 'users',
      });
    });

    test('accepts table aliases in single-table SELECT', () => {
      expect(extractSingleTableFromSql('SELECT u.id, u.name FROM public.users AS u WHERE u.id = 1')).toEqual({
        schemaName: 'public',
        tableName: 'users',
      });
    });

    test('rejects multiple statements', () => {
      expect(isSimpleSelectQuery('SELECT * FROM users; SELECT * FROM orders')).toBe(false);
      expect(extractSingleTableFromSql('SELECT * FROM users; SELECT * FROM orders')).toBeNull();
    });
  });

  describe('simple SELECT column source mapping', () => {
    test('maps plain columns to themselves', () => {
      expect(extractColumnSourcesFromSql('SELECT id, name FROM users')).toEqual({
        id: 'id',
        name: 'name',
      });
    });

    test('maps aliases back to source columns', () => {
      expect(extractColumnSourcesFromSql('SELECT id AS user_id, first_name name FROM users')).toEqual({
        user_id: 'id',
        name: 'first_name',
      });
    });

    test('omits wildcard from explicit source map', () => {
      expect(extractColumnSourcesFromSql('SELECT * FROM users')).toEqual({});
    });

    test('maps simple SELECT metadata with table information', () => {
      expect(extractColumnMetadataFromSql('SELECT id AS user_id, name FROM public.users')).toEqual({
        user_id: { schemaName: 'public', tableName: 'users', sourceColumnName: 'id' },
        name: { schemaName: 'public', tableName: 'users', sourceColumnName: 'name' },
      });
    });
  });

  describe('JOIN column metadata', () => {
    test('maps explicitly qualified joined columns', () => {
      const sql = `
        SELECT
          o.id AS order_id,
          o.product_name,
          u.id AS user_id,
          u.name AS user_name
        FROM public.orders o
        INNER JOIN public.users u ON o.user_id = u.id
      `;

      expect(extractColumnMetadataFromSql(sql)).toEqual({
        order_id: { schemaName: 'public', tableName: 'orders', sourceColumnName: 'id' },
        product_name: { schemaName: 'public', tableName: 'orders', sourceColumnName: 'product_name' },
        user_id: { schemaName: 'public', tableName: 'users', sourceColumnName: 'id' },
        user_name: { schemaName: 'public', tableName: 'users', sourceColumnName: 'name' },
      });
    });

    test('maps MSSQL bracket-qualified joined columns', () => {
      const sql = `
        SELECT
          [dbo].[orders].[id],
          [dbo].[orders].[product_name],
          [dbo].[users].[name],
          [dbo].[users].[email]
        FROM [dbo].[orders]
        INNER JOIN [dbo].[users] ON [dbo].[orders].[user_id] = [dbo].[users].[id]
      `;

      expect(extractColumnMetadataFromSql(sql)).toEqual({
        id: { schemaName: 'dbo', tableName: 'orders', sourceColumnName: 'id' },
        product_name: { schemaName: 'dbo', tableName: 'orders', sourceColumnName: 'product_name' },
        name: { schemaName: 'dbo', tableName: 'users', sourceColumnName: 'name' },
        email: { schemaName: 'dbo', tableName: 'users', sourceColumnName: 'email' },
      });
    });

    test('maps table aliases declared with AS', () => {
      const sql = `
        SELECT o.id AS order_id, u.email AS user_email
        FROM orders AS o
        JOIN users AS u ON o.user_id = u.id
      `;

      expect(extractColumnMetadataFromSql(sql)).toEqual({
        order_id: { tableName: 'orders', sourceColumnName: 'id' },
        user_email: { tableName: 'users', sourceColumnName: 'email' },
      });
    });

    test('leaves unqualified joined columns unmapped', () => {
      const sql = 'SELECT id, o.product_name FROM orders o JOIN users u ON o.user_id = u.id';
      expect(extractColumnMetadataFromSql(sql)).toEqual({
        product_name: { tableName: 'orders', sourceColumnName: 'product_name' },
      });
    });

    test('does not map SELECT star in joins', () => {
      expect(extractColumnMetadataFromSql('SELECT * FROM orders JOIN users ON orders.user_id = users.id')).toEqual({});
    });

    test('does not map ambiguous table-name qualifiers across schemas', () => {
      const sql = `
        SELECT users.name
        FROM public.users pu
        JOIN archive.users au ON pu.id = au.id
      `;

      expect(extractColumnMetadataFromSql(sql)).toEqual({});
    });
  });

  describe('blocked and ambiguous constructs', () => {
    test.each([
      'WITH cte AS (SELECT id FROM users) SELECT id FROM cte',
      'SELECT DISTINCT id FROM users',
      'SELECT id, COUNT(*) FROM users GROUP BY id',
      'SELECT id FROM users HAVING COUNT(*) > 1',
      'SELECT id FROM users UNION SELECT id FROM admins',
      'SELECT id FROM (SELECT id FROM users) u',
      'SELECT (id + 1) AS id2 FROM users',
      'SELECT SUM(total) FROM orders',
      'UPDATE users SET name = \'x\'',
      'DELETE FROM users',
    ])('rejects %s', sql => {
      expect(isSimpleSelectQuery(sql)).toBe(false);
      expect(extractSingleTableFromSql(sql)).toBeNull();
      expect(extractColumnSourcesFromSql(sql)).toBeNull();
      expect(extractColumnMetadataFromSql(sql)).toBeNull();
    });

    test('rejects malformed select lists', () => {
      expect(extractColumnSourcesFromSql('SELECT id, FROM users')).toBeNull();
      expect(extractColumnMetadataFromSql('SELECT id, FROM users')).toBeNull();
    });

    test('ignores blocked words inside string literals and comments', () => {
      const sql = `
        -- join should be ignored here
        SELECT id, name FROM users WHERE name = 'with union join'
      `;
      expect(extractSingleTableFromSql(sql)).toEqual({ tableName: 'users' });
    });
  });
});
