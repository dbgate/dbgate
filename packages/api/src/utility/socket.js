let sseResponse = null;
let electronSender = null;
let init = [];

module.exports = {
  setSseResponse(value) {
    sseResponse = value;
    setInterval(() => this.emit('ping'), 29 * 1000);
  },
  setElectronSender(value) {
    electronSender = value;
  },
  emit(message, data) {
    if (electronSender) {
      if (init.length > 0) {
        for (const item of init) {
          electronSender.send(item.message, item.data == null ? null : item.data);
        }
        init = [];
      }
      electronSender.send(message, data == null ? null : data);
    } else if (sseResponse) {
      if (init.length > 0) {
        for (const item of init) {
          sseResponse.write(
            `event: ${item.message}\ndata: ${JSON.stringify(item.data == null ? null : item.data)}\n\n`
          );
        }
        init = [];
      }
      sseResponse.write(`event: ${message}\ndata: ${JSON.stringify(data == null ? null : data)}\n\n`);
    } else {
      init.push([{ message, data }]);
    }
  },
  emitChanged(key) {
    // console.log('EMIT CHANGED', key);
    this.emit('changed-cache', key);
    // this.emit(key);
  },
};
