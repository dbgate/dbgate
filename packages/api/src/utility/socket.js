let res = null;
let init = '';

module.exports = {
  set(value) {
    res = value;
  },
  // get() {
  //   return socket;
  // },
  emit(message, data) {
    if (res) {
      if (init) {
        res.write(init);
        init = '';
      }
      res.write(`event: ${message}\ndata: ${JSON.stringify(data == null ? null : data)}\n\n`);
    } else {
      init += res;
    }

    // console.log('EMIT:', message, data);
    // socket.emit(message, data);
  },
  emitChanged(key) {
    this.emit('clean-cache', key);
    this.emit(key);
    // console.log('EMIT_CHANGED:', key);
    // socket.emit('clean-cache', key);
    // socket.emit(key);

    // socket.send(key, 'clean-cache');
    // socket.send(null, key);
  },
};
