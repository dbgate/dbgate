export default function objType(obj) {
  if (obj?.$oid) {
    return 'ObjectId';
  }
  
  const type = Object.prototype.toString.call(obj).slice(8, -1);
  if (type === 'Object') {
    if (typeof obj[Symbol.iterator] === 'function') {
      return 'Iterable';
    }
    return obj.constructor.name;
  }

  return type;
}
