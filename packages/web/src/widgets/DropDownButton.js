import React from 'react';
import { FontIcon } from '../icons';
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
      <FontIcon icon="mdi mdi-chevron-down" />
    </InlineButton>
  );
}
