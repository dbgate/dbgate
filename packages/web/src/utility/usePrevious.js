// copied from https://usehooks.com/usePrevious/

import React from 'react';

export default function usePrevious(value) {
  const ref = React.useRef();

  // Store current value in ref

  React.useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes

  // Return previous value (happens before update in useEffect above)

  return ref.current;
}
