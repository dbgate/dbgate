import React from 'react';
import { showMenu } from '../modals/DropDownMenu';
import InlineButton from './InlineButton';

export default function DropDownButton({ children }) {
  const buttonRef = React.useRef(null);

  const handleShowMenu = () => {
    const rect = buttonRef.current.getBoundingClientRect();
    showMenu(rect.left, rect.bottom, children);
  };

  return (
    <InlineButton buttonRef={buttonRef} onClick={handleShowMenu} square>
      <i className="fas fa-chevron-down" />
    </InlineButton>
  );
}
