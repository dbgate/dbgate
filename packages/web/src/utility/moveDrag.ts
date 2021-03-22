export default function moveDrag(node, [onStart, onMove, onEnd]) {
  let startX = null;
  let startY = null;

  const handleMoveDown = e => {
    if (e.button != 0) return;
    startX = e.clientX;
    startY = e.clientY;
    document.addEventListener('mousemove', handleMoveMove, true);
    document.addEventListener('mouseup', handleMoveEnd, true);
    onStart();
  };

  const handleMoveMove = e => {
    e.preventDefault();
    const diffX = e.clientX - startX;
    startX = e.clientX;
    const diffY = e.clientY - startY;
    startY = e.clientY;

    onMove(diffX, diffY);
  };
  const handleMoveEnd = e => {
    e.preventDefault();
    startX = null;
    startY = null;
    document.removeEventListener('mousemove', handleMoveMove, true);
    document.removeEventListener('mouseup', handleMoveEnd, true);
    onEnd();
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
