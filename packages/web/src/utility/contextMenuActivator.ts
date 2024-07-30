export default function contextMenuActivator(node, activator) {
  const handleContextMenu = async e => {
    activator.activate();
  };

  node.addEventListener('contextmenu', handleContextMenu);

  return {
    destroy() {
      node.removeEventListener('contextmenu', handleContextMenu);
    },
  };
}
