import React from 'react';
import axios from 'axios'

export default function useFetch(url, defValue) {
  const [value, setValue] = React.useState(defValue);

  async function loadValue() {
    setValue(await axios.get(url));
  }
  React.useEffect(() => {
    loadValue();
  }, [url]);

  return value;
}
