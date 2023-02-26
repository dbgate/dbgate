const readline = require('readline');

class Queue {
  constructor() {
    this.elements = {};
    this.head = 0;
    this.tail = 0;
  }
  enqueue(element) {
    this.elements[this.tail] = element;
    this.tail++;
  }
  dequeue() {
    const item = this.elements[this.head];
    delete this.elements[this.head];
    this.head++;
    return item;
  }
  peek() {
    return this.elements[this.head];
  }
  getLength() {
    return this.tail - this.head;
  }
  isEmpty() {
    return this.getLength() === 0;
  }
}

class LineReader {
  constructor(input) {
    this.input = input;
    this.queue = new Queue();
    this.resolve = null;
    this.isEnded = false;
    this.rl = readline.createInterface({
      input,
    });
    this.input.pause();

    this.rl.on('line', line => {
      this.input.pause();
      if (this.resolve) {
        const resolve = this.resolve;
        this.resolve = null;
        resolve(line);
        return;
      }
      this.queue.enqueue(line);
    });

    this.rl.on('close', () => {
      if (this.resolve) {
        const resolve = this.resolve;
        this.resolve = null;
        this.isEnded = true;
        resolve(null);
        return;
      }
      this.queue.enqueue(null);
    });
  }

  readLine() {
    if (this.isEnded) {
      return Promise.resolve(null);
    }

    if (!this.queue.isEmpty()) {
      const res = this.queue.dequeue();
      if (res == null) this.isEnded = true;
      return Promise.resolve(res);
    }

    this.input.resume();

    return new Promise(resolve => {
      this.resolve = resolve;
    });
  }

  close() {
    this.isEnded = true;
    return new Promise(resolve => this.input.close(resolve));
  }
}

module.exports = LineReader;
