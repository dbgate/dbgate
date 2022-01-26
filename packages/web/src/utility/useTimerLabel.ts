import _ from 'lodash';
import { getContext, onDestroy } from 'svelte';
import { updateStatuBarInfoItem } from './statusBarStore';

function formatSeconds(duration) {
  if (duration == null) return '';
  const hours = _.padStart(Math.floor(duration / 3600).toString(), 2, '0');
  const minutes = _.padStart((Math.floor(duration / 60) % 60).toString(), 2, '0');
  const seconds = _.padStart((duration % 60).toString(), 2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export default function useTimerLabel() {
  let duration = null;
  let busy = false;
  let timerHandle = null;
  const tabid = getContext('tabid');

  const update = () => {
    updateStatuBarInfoItem(tabid, 'durationSeconds', { text: formatSeconds(duration) });
  };

  const start = () => {
    duration = 0;
    busy = true;
    update();
    timerHandle = window.setInterval(() => {
      duration += 1;
      update();
    }, 1000);
  };

  const stop = () => {
    busy = false;
    update();
    if (timerHandle) {
      window.clearInterval(timerHandle);
      timerHandle = null;
    }
  };

  onDestroy(() => {
    if (timerHandle) {
      window.clearInterval(timerHandle);
      timerHandle = null;
    }
  });

  return {
    start,
    stop,
  };
}
