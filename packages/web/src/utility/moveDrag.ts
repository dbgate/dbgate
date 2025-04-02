export default function moveDrag(node, dragEvents) {
  if (!dragEvents) return;

  const [onStart, onMove, onEnd] = dragEvents;
  let startX = null;
  let startY = null;

  let clientX = null;
  let clientY = null;

  const handleMoveDown = e => {
    if (e.button != 0) return;

    // const zoomKoef = window.getComputedStyle(node)['zoom'];

    const clientRect = node.getBoundingClientRect();
    clientX = clientRect.left;
    clientY = clientRect.top;

    // console.log('ZOOM', zoomKoef);
    // console.log('CLIENT RECT', clientRect);
    // console.log('e.clientX', e.clientX);
    // console.log('e.clientY', e.clientY);

    startX = e.clientX;
    startY = e.clientY;
    document.addEventListener('mousemove', handleMoveMove, true);
    document.addEventListener('mouseup', handleMoveEnd, true);
    onStart(e.clientX - clientX, e.clientY - clientY);
  };

  const handleMoveMove = e => {
    // const zoomKoef = window.getComputedStyle(node)['zoom'];

    e.preventDefault();
    const diffX = e.clientX - startX;
    startX = e.clientX;
    const diffY = e.clientY - startY;
    startY = e.clientY;

    onMove(diffX, diffY, e.clientX - clientX, e.clientY - clientY);
  };
  const handleMoveEnd = e => {
    // const zoomKoef = window.getComputedStyle(node)['zoom'];

    e.preventDefault();
    startX = null;
    startY = null;
    document.removeEventListener('mousemove', handleMoveMove, true);
    document.removeEventListener('mouseup', handleMoveEnd, true);
    onEnd(e.clientX - clientX, e.clientY - clientY);
  };

  node.addEventListener('mousedown', handleMoveDown);

  return {
    destroy() {
      node.removeEventListener('mousedown', handleMoveDown);
      if (startX != null || startY != null) {
        document.removeEventListener('mousemove', handleMoveMove, true);
        document.removeEventListener('mouseup', handleMoveEnd, true);
      }
    },
  };
}
