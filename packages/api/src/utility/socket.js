let sseResponse = null;
let electronSender = null;
let init = '';

module.exports = {
  setSseResponse(value) {
    sseResponse = value;
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
    this.emit('changed-cache', key);
    // this.emit(key);
  },
};
