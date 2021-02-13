// @ts-nocheck
import styled from 'styled-components';

export const FlexCol3 = styled.div`
  flex-basis: 25%;
  max-width: 25%;
  ${props =>
    !!props.marginRight &&
    `
  margin-right: ${props.marginRight}px;
  `}
  ${props =>
    !!props.marginLeft &&
    `
  margin-left: ${props.marginLeft}px;
  `}
`;
export const FlexCol4 = styled.div`
  flex-basis: 33.3333%;
  max-width: 33.3333%;
  ${props =>
    !!props.marginRight &&
    `
  margin-right: ${props.marginRight}px;
  `}
  ${props =>
    !!props.marginLeft &&
    `
  margin-left: ${props.marginLeft}px;
  `}
`;
export const FlexCol6 = styled.div`
  flex-basis: 50%;
  max-width: 50%;
  ${props =>
    !!props.marginRight &&
    `
  margin-right: ${props.marginRight}px;
  `}
  ${props =>
    !!props.marginLeft &&
    `
  margin-left: ${props.marginLeft}px;
  `}
`;
export const FlexCol8 = styled.div`
  flex-basis: 66.6667%;
  max-width: 66.6667%;
  ${props =>
    !!props.marginRight &&
    `
  margin-right: ${props.marginRight}px;
  `}
  ${props =>
    !!props.marginLeft &&
    `
  margin-left: ${props.marginLeft}px;
  `}
`;
export const FlexCol9 = styled.div`
  flex-basis: 75%;
  max-width: 75%;
  ${props =>
    !!props.marginRight &&
    `
  margin-right: ${props.marginRight}px;
  `}
  ${props =>
    !!props.marginLeft &&
    `
  margin-left: ${props.marginLeft}px;
  `}
`;
