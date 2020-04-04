// @ts-nocheck
import React from 'react';
import styled from 'styled-components';
import theme from '../theme';

const ButtonDiv = styled.div`
  //box-shadow: 3px 4px 0px 0px #899599;
  background: linear-gradient(to bottom, #ededed 5%, #bab1ba 100%);
  background-color: #ededed;
  //border-radius: 15px;
  border: 1px solid #bbb;
  display: inline-block;
  cursor: pointer;
  // color: #3a8a9e;
  // color: gray;
  // font-family: Arial;
  vertical-align: middle;
  color: black;
  font-size: 12px;
  padding: 3px;
  margin: 0;
  // padding: 7px 25px;
  text-decoration: none;
  // text-shadow: 0px 1px 0px #e1e2ed;
  &:hover {
    border: 1px solid #777;
  }
  &:active:hover {
    background: linear-gradient(to bottom, #bab1ba 5%, #ededed 100%);
    background-color: #bab1ba;
  }
  display: flex;

  ${props =>
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

// ${props =>
//     !props.disabled &&
//     `
//   &:hover {
//     background-color: #286090;
//   }

//   &:active:hover {
//     background-color: #204d74;
//   }
//   `}

//   ${props =>
//     props.disabled &&
//     `
//     background-color: #ccc;
//     color: gray;
//   `}

export default function InlineButton({
  children,
  onClick = undefined,
  buttonRef = undefined,
  disabled = undefined,
  square = false,
}) {
  return (
    <ButtonDiv
      className="buttonLike"
      ref={buttonRef}
      onClick={() => {
        if (!disabled && onClick) onClick();
      }}
      disabled={disabled}
      square={square}
    >
      <InnerDiv>{children}</InnerDiv>
    </ButtonDiv>
  );
}
