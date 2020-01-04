import React from 'react';
import axios from './axios';

export default function useFetch(url, defValue) {
  const [value, setValue] = React.useState(defValue);

  async function loadValue() {
    const resp = await axios.get(url);
    setValue(resp.data);
  }
  React.useEffect(() => {
    loadValue();
  }, [url]);

  return value;
}
