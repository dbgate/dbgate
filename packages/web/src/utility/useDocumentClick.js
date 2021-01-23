import React from 'react';

export default function useDocumentClick(callback) {
  const mouseUpListener = React.useCallback(e => {
    callback();
    document.removeEventListener('mouseup', mouseUpListener, true);
  }, []);
  const mouseDownListener = React.useCallback(e => {
    document.addEventListener('mouseup', mouseUpListener, true);
    document.removeEventListener('mousedown', mouseDownListener, true);
  }, []);

  React.useEffect(() => {
    document.addEventListener('mousedown', mouseDownListener, true);
    return () => {
      document.removeEventListener('mouseup', mouseUpListener, true);
      document.removeEventListener('mousedown', mouseDownListener, true);
    };
  }, []);
}
