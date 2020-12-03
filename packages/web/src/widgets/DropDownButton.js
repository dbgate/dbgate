import React from 'react';
import { FontIcon } from '../icons';
import { useShowMenu } from '../modals/showMenu';
import InlineButton from './InlineButton';

export default function DropDownButton({ children }) {
  const buttonRef = React.useRef(null);
  const showMenu = useShowMenu();

  const handleShowMenu = () => {
    const rect = buttonRef.current.getBoundingClientRect();
    showMenu(rect.left, rect.bottom, children);
  };

  return (
    <InlineButton buttonRef={buttonRef} onClick={handleShowMenu} square>
      <FontIcon icon="icon chevron-down" />
    </InlineButton>
  );
}
