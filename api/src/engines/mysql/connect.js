const mysql = require('mysql');

module.exports = function connect({ server, port, user, password }) {
  return new Promise((resolve, reject) => {
    const connection = mysql.createConnection({ host: server, port, user, password });
    connection.query("show variables like 'version'", function(error, results, fields) {
      if (error) reject(error);
      const version = results[0].Value;
      resolve({ version });
    });
  });
};
