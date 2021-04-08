export default function clickOutside(node) {
  const handleClick = event => {
    if (node && !node.contains(event.target) && !event.defaultPrevented) {
      node.dispatchEvent(new CustomEvent('clickOutside'));
    }
  };

  document.addEventListener('mousedown', handleClick, true);

  return {
    destroy() {
      document.removeEventListener('mousedown', handleClick, true);
    },
  };
}
