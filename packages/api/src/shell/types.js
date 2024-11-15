/**
 * Reader (input) object for {@link copyStream} function
 * @typedef {Object} readerType
 *
 */

/**
 * Writer (output) object for {@link copyStream} function
 * @typedef {Object} writerType
 *
 */

/**
 * Typ uživatelské role.
 * @typedef {('mysql@dbgate-plugin-mysql' | 'mariadb@dbgate-plugin-mysql' | 'postgres@dbgate-plugin-postgres'
 *      |'sqlite@dbgate-plugin-sqlite' | 'oracle@dbgate-plugin-oracle' | 'cockroach@dbgate-plugin-postgres' | 'redshift@dbgate-plugin-postgres')} engineType
 */

/**
 * @typedef {Object} connectionType
 * @property {engineType} engine
 * @property {string} server
 * @property {string} user
 * @property {string} password
 * @property {string} database
 * @property {string} port
 */
