// import { useState, useCallback, useLayoutEffect } from 'react';

// function getDimensionObject(node) {
//   const rect = node.getBoundingClientRect();

//   return {
//     width: rect.width,
//     height: rect.height,
//     top: 'x' in rect ? rect.x : rect.top,
//     left: 'y' in rect ? rect.y : rect.left,
//     x: 'x' in rect ? rect.x : rect.left,
//     y: 'y' in rect ? rect.y : rect.top,
//     right: rect.right,
//     bottom: rect.bottom,
//   };
// }

// function useDimensions({ liveMeasure = true } = {}) {
//   const [dimensions, setDimensions] = useState({});
//   const [node, setNode] = useState(null);

//   const ref = useCallback(node => {
//     setNode(node);
//   }, []);

//   useLayoutEffect(() => {
//     if (node) {
//       const measure = () => window.requestAnimationFrame(() => setDimensions(getDimensionObject(node)));
//       measure();

//       if (liveMeasure) {
//         window.addEventListener('resize', measure);
//         window.addEventListener('scroll', measure);

//         return () => {
//           window.removeEventListener('resize', measure);
//           window.removeEventListener('scroll', measure);
//         };
//       }
//     }
//   }, [node]);

//   return [ref, dimensions, node];
// }

// export default useDimensions;

import { useLayoutEffect, useState, useCallback } from 'react';
import ResizeObserver from 'resize-observer-polyfill';

// Export hook
export default function useDimensions(dependencies = []) {
  const [node, setNode] = useState(null);
  const ref = useCallback(newNode => {
    setNode(newNode);
  }, []);

  // Keep track of measurements
  const [dimensions, setDimensions] = useState({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
  });

  // Define measure function
  const measure = useCallback(innerNode => {
    const rect = innerNode.getBoundingClientRect();
    setDimensions({
      x: rect.left,
      y: rect.top,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  useLayoutEffect(() => {
    if (!node) {
      return;
    }

    // Set initial measurements
    measure(node);

    // Observe resizing of element
    const resizeObserver = new ResizeObserver(() => {
      measure(node);
    });

    resizeObserver.observe(node);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [node, measure, ...dependencies]);

  return [ref, dimensions, node];
}
