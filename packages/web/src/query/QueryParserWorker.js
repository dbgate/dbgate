import { splitQuery } from 'dbgate-query-splitter';

onmessage = e => {
  const result = splitQuery(e.data.text, e.data.options);
  postMessage(result);
};
