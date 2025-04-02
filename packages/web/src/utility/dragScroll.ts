import { supressContextMenu } from './contextMenu';

export default function dragScroll(node, onScroll) {
  if (!onScroll) return;

  let lastX = null;
  let lastY = null;

  let sumMoved = 0;

  const handleMoveDown = e => {
    if (e.button != 2) return;

    lastX = e.clientX;
    lastY = e.clientY;
    document.addEventListener('mousemove', handleMoveMove, true);
    document.addEventListener('mouseup', handleMoveEnd, true);
  };

  const handleMoveMove = e => {
    // const zoomKoef = window.getComputedStyle(node)['zoom'];

    e.preventDefault();

    sumMoved += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY);
    if (sumMoved > 20) {
      supressContextMenu();
    }

    onScroll(e.clientX - lastX, e.clientY - lastY);

    lastX = e.clientX;
    lastY = e.clientY;
  };
  const handleMoveEnd = e => {
    // const zoomKoef = window.getComputedStyle(node)['zoom'];

    e.preventDefault();
    e.stopPropagation();

    lastX = null;
    lastY = null;
    document.removeEventListener('mousemove', handleMoveMove, true);
    document.removeEventListener('mouseup', handleMoveEnd, true);
  };

  node.addEventListener('mousedown', handleMoveDown);

  return {
    destroy() {
      node.removeEventListener('mousedown', handleMoveDown);
      if (lastX != null || lastY != null) {
        document.removeEventListener('mousemove', handleMoveMove, true);
        document.removeEventListener('mouseup', handleMoveEnd, true);
      }
    },
  };
}
