module.exports = connection => {
  const { engine } = connection;
  return require(`./${engine}`);
};
