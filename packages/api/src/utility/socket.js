let socket = null;

module.exports = {
  set(value) {
    socket = value;
  },
  get() {
    return socket;
  },
  emit(message, data) {
    console.log('EMIT:', message, data);
    socket.emit(message, data);
  },
};
