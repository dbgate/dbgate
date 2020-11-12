// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import useTheme from '../theme/useTheme';

const ButtonDiv = styled.div`
  background: linear-gradient(
    to bottom,
    ${(props) => props.theme.inlinebtn_background} 5%,
    ${(props) => props.theme.inlinebtn_background3} 100%
  );
  background-color: ${(props) => props.theme.inlinebtn_background};
  border: 1px solid ${(props) => props.theme.inlinebtn_background3};
  display: inline-block;
  cursor: pointer;
  vertical-align: middle;
  color: ${(props) => props.theme.inlinebtn_font1};;
  font-size: 12px;
  padding: 3px;
  margin: 0;
  text-decoration: none;
  &:hover {
    border: 1px solid ${(props) => props.theme.inlinebtn_font2};
  }
  &:active:hover {
    background: linear-gradient(
      to bottom,
      ${(props) => props.theme.inlinebtn_background3} 5%,
      ${(props) => props.theme.inlinebtn_background} 100%
    );
    background-color: ${(props) => props.theme.inlinebtn_background3};
  }
  display: flex;

  ${(props) =>
    props.square &&
    `
      width: 18px;
    `}
`;

const InnerDiv = styled.div`
  margin: auto;
  flex: 1;
  text-align: center;
`;

export default function InlineButton({
  children,
  onClick = undefined,
  buttonRef = undefined,
  disabled = undefined,
  square = false,
}) {
  const theme = useTheme();
  return (
    <ButtonDiv
      className="buttonLike"
      ref={buttonRef}
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      disabled={disabled}
      square={square}
      theme={theme}
    >
      <InnerDiv>{children}</InnerDiv>
    </ButtonDiv>
  );
}
