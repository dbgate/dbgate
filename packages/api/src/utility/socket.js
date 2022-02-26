let sseResponse = null;
let electronSender = null;
let init = '';

module.exports = {
  setSseResponse(value) {
    sseResponse = value;
    setInterval(() => this.emit('ping'), 30 * 1000);
  },
  setElectronSender(value) {
    electronSender = value;
  },
  emit(message, data) {
    if (electronSender) {
      electronSender.send(message, data == null ? null : data);
    } else if (sseResponse) {
      if (init) {
        sseResponse.write(init);
        init = '';
      }
      sseResponse.write(`event: ${message}\ndata: ${JSON.stringify(data == null ? null : data)}\n\n`);
    } else {
      init += sseResponse;
    }
  },
  emitChanged(key) {
    // console.log('EMIT CHANGED', key);
    this.emit('changed-cache', key);
    // this.emit(key);
  },
};
