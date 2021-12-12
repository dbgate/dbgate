import { splitQuery } from 'dbgate-query-splitter';

export default function c(data) {
  const result = splitQuery(data.text, data.options);
  return result;
}
