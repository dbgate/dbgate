interface Reference<T> {
  set(value: T);
  get(): T;
  reset(): void;
  update(func: (arg: T) => T);
}

export default function createRef<T>(value: T): Reference<T> {
  return {
    value,
    initValue: value,
    
    set(value) {
      this.value = value;
    },
    reset() {
      this.value = this.initValue;
    },
    get() {
      return this.value;
    },
    update(func) {
      this.value = func(this.value);
    },
  } as Reference<T>;
}
