const fs = require('fs');

const template = fs.readFileSync('./index.html.tpl', 'utf-8');

for (const page of [
  '',
  'not-logged',
  'error',
  'login',
  'admin-login',
  'admin',
  'license',
  'admin-license',
  'set-admin-password',
  'redirect',
]) {
  const text = template.replace(/{{page}}/g, page);
  fs.writeFileSync(`public/${page || 'index'}.html`, text);
}
