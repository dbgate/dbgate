const finalizers = [];

module.exports = {
  async run() {
    for (const func of finalizers) {
      await func();
    }
  },
  register(func) {
    finalizers.push(func);
  },
};
