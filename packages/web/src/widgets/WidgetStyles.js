import styled from 'styled-components';
import theme from '../theme';

export const SearchBoxWrapper = styled.div`
  display: flex;
  margin-bottom: 5px;
`;

export const MainContainer = styled.div`
  position: relative;
  display: flex;
  flex-flow: column wrap;
  flex: 1;
  flex-direction: column;
  user-select: none;
`;

export const OuterContainer = styled.div`
  flex: 1 1 0;
  overflow: hidden;
  width: ${theme.leftPanel.width}px;
  position: relative;
  flex-direction: column;
  display: flex;
`;

export const InnerContainer = styled.div`
  flex: 1 1;
  overflow: scroll;
  width: ${theme.leftPanel.width}px;
`;

export const Input = styled.input`
  flex: 1;
  min-width: 90px;
`;

export const WidgetTitle = styled.div`
  padding: 5px;
  font-weight: bold;
  text-transform: uppercase;
  background-color: gray;
  // background-color: #CEC;
`;
