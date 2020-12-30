// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import { FontIcon } from '../icons';
import { useShowMenu } from '../modals/showMenu';
import dimensions from '../theme/dimensions';
import useTheme from '../theme/useTheme';

const ButtonDiv = styled.div`
  padding: 5px 15px;
  // margin: 2px;
  color: ${(props) => props.theme.main_font1};
  border: 0;
  border-right: 1px solid ${(props) => props.theme.border};
  height: ${dimensions.toolBar.height}px;

  ${(props) =>
    !props.disabled &&
    `
  &:hover {
    background-color: ${props.theme.toolbar_background2} ;
  }

  &:active:hover {
    background-color: ${props.theme.toolbar_background3};
  }
  `}

  ${(props) =>
    props.disabled &&
    `
    color: ${props.theme.main_font3};
  `}
`;

const StyledIconSpan = styled.span`
  margin-right: 5px;
  // font-size: 18px;
  color: ${(props) => (props.disabled ? props.theme.main_font3 : props.theme.main_font_link)};
`;

const ButtonDivInner = styled.div`
  position: relative;
  top: ${(props) => props.patchY}px;
  white-space: nowrap;
`;

const ButtonExternalImage = styled.img`
  width: 20px;
  height: 20px;
`;

export default function ToolbarButton({ children, onClick, icon = undefined, disabled = undefined, patchY = 2 }) {
  const theme = useTheme();
  return (
    <ButtonDiv
      theme={theme}
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      disabled={disabled}
    >
      <ButtonDivInner patchY={patchY}>
        {icon && (
          <StyledIconSpan disabled={disabled} theme={theme}>
            <FontIcon icon={icon} />
          </StyledIconSpan>
        )}
        {children}
      </ButtonDivInner>
    </ButtonDiv>
  );
}

export function ToolbarButtonExternalImage({ image, onClick, disabled = undefined }) {
  const theme = useTheme();
  return (
    <ButtonDiv
      theme={theme}
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      disabled={disabled}
    >
      <ButtonExternalImage src={image} />
    </ButtonDiv>
  );
}

export function ToolbarDropDownButton({ children, icon = undefined, text, disabled = undefined, patchY = 2 }) {
  const theme = useTheme();
  const showMenu = useShowMenu();
  const buttonRef = React.useRef(null);

  return (
    <ButtonDiv
      theme={theme}
      onClick={() => {
        if (disabled) return;

        const rect = buttonRef.current.getBoundingClientRect();
        showMenu(rect.left, rect.bottom, children);
      }}
      disabled={disabled}
    >
      <ButtonDivInner patchY={patchY} ref={buttonRef}>
        {icon && (
          <StyledIconSpan disabled={disabled} theme={theme}>
            <FontIcon icon={icon} />
          </StyledIconSpan>
        )}
        {text}
        <FontIcon icon="icon chevron-down" />
      </ButtonDivInner>
    </ButtonDiv>
  );
}
