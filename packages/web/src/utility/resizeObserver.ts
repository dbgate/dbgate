import _ from 'lodash';
import ResizeObserver from 'resize-observer-polyfill';

export default function resizeObserver(node, observerEnabled) {
  const measure = () => {
    const rect = node.getBoundingClientRect();

    node.dispatchEvent(
      new CustomEvent('resize', {
        detail: {
          width: rect.width,
          height: rect.height,
        },
      })
    );
  };

  let resizeObserver = null;

  function doUpdate() {
    if (observerEnabled && !resizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        measure();
      });
      resizeObserver.observe(node);
    }
    if (!observerEnabled && resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  }

  doUpdate();
  if (observerEnabled) measure();

  return {
    destroy() {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    },
    update(value) {
      observerEnabled = value;
      doUpdate();
    },
  };
}
