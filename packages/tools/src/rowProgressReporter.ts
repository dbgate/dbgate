export class RowProgressReporter {
  counter = 0;
  timeoutHandle = null;

  constructor(public progressName, public field = 'writtenRowCount') {}

  add(count: number) {
    this.counter += count;
    if (!this.progressName) {
      return;
    }

    if (this.timeoutHandle) {
      return;
    }
    this.timeoutHandle = setTimeout(() => {
      this.timeoutHandle = null;
      this.send();
    }, 1000);
  }

  finish() {
    if (!this.progressName) {
      return;
    }

    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    this.send();
  }

  send() {
    if (!this.progressName) {
      return;
    }

    process.send({
      msgtype: 'progress',
      progressName: this.progressName,
      [this.field]: this.counter,
    });
  }
}
