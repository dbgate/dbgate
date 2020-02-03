let socket = null;

module.exports = {
  set(value) {
    socket = value;
  },
  get() {
    return socket;
  },
  emit(message, data) {
    socket.emit(message, data);
  },
};
