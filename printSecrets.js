const fs = require('fs');

const text = `
module.exports = '${process.env.GIST_UPLOAD_SECRET}';
`;

fs.writeFileSync('packages/api/src/gistSecret.js', text);
