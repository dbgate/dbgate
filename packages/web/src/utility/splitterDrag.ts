export default function splitterDrag(node, axes) {
  let resizeStart = null;

  const handleResizeDown = e => {
    resizeStart = e[axes];
    document.addEventListener('mousemove', handleResizeMove, true);
    document.addEventListener('mouseup', handleResizeEnd, true);
  };

  const handleResizeMove = e => {
    e.preventDefault();
    const diff = e[axes] - resizeStart;
    resizeStart = e[axes];
    node.dispatchEvent(
      new CustomEvent('resizeSplitter', {
        detail: diff,
      })
    );
  };
  const handleResizeEnd = e => {
    e.preventDefault();
    resizeStart = null;
    document.removeEventListener('mousemove', handleResizeMove, true);
    document.removeEventListener('mouseup', handleResizeEnd, true);
  };

  node.addEventListener('mousedown', handleResizeDown);

  return {
    destroy() {
      node.removeEventListener('mousedown', handleResizeDown);
      if (resizeStart != null) {
        document.removeEventListener('mousemove', handleResizeMove, true);
        document.removeEventListener('mouseup', handleResizeEnd, true);
      }
    },
  };
}
