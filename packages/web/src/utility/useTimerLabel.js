import React from 'react';
import _ from 'lodash';

function formatSeconds(duration) {
  if (duration == null) return '';
  const hours = _.padStart(Math.floor(duration / 3600).toString(), 2, '0');
  const minutes = _.padStart((Math.floor(duration / 60) % 60).toString(), 2, '0');
  const seconds = _.padStart((duration % 60).toString(), 2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export default function useTimerLabel() {
  const [duration, setDuration] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (busy) {
      setDuration(0);
      const handle = setInterval(() => setDuration(x => x + 1), 1000);
      return () => window.clearInterval(handle);
    }
  }, [busy]);

  const start = React.useCallback(() => {
    setBusy(true);
  }, []);

  const stop = React.useCallback(() => {
    setBusy(false);
  }, []);

  return {
    start,
    stop,
    text: formatSeconds(duration),
    duration,
  };
}
