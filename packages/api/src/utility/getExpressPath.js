function getExpressPath(path) {
  path = path.replace(/\/*$/, '').replace(/^\/*/, '');
  const root = (process.env.WEB_ROOT || '').replace(/^\/*/, '').replace(/\/*$/, '');
  if (root) {
    return `/${root}/${path}`;
  }
  return `/${path}`;
}

module.exports = getExpressPath;
