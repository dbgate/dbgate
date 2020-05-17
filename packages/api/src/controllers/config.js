module.exports = {
  get_meta: 'get',
  async get() {
    return {
      runAsPortal: !!process.env.CONNECTIONS,
    };
  },
};
