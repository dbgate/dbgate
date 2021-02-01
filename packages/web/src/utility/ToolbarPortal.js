import React from 'react';
import ReactDOM from 'react-dom';

export default function ToolbarPortal({ toolbarPortalRef, tabVisible, children }) {
  return (
    (toolbarPortalRef &&
      toolbarPortalRef.current &&
      tabVisible &&
      children &&
      ReactDOM.createPortal(children, toolbarPortalRef.current)) ||
    null
  );
}
