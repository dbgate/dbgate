import styled from 'styled-components';
import theme from '../theme';

// export const SearchBoxWrapper = styled.div`
//   display: flex;
//   margin-bottom: 5px;
// `;

export const ManagerMainContainer = styled.div`
  position: relative;
  display: flex;
  flex-flow: column wrap;
  flex: 1;
  flex-direction: column;
  user-select: none;
`;

export const ManagerOuterContainer = styled.div`
  flex: 1 1 0;
  overflow: hidden;
  position: relative;
  flex-direction: column;
  display: flex;
`;

export const ManagerOuterContainer1 = styled(ManagerOuterContainer)`
  flex: 0 0 60%;
`;

export const ManagerOuterContainer2 = styled(ManagerOuterContainer)`
  flex: 0 0 40%;
`;

export const ManagerOuterContainerFull = styled(ManagerOuterContainer)`
  flex: 1;
`;

export const ManagerInnerContainer = styled.div`
  flex: 1 1;
  overflow-y: auto;
  overflow-x: auto;
`;

// export const Input = styled.input`
//   flex: 1;
//   min-width: 90px;
// `;

export const WidgetTitle = styled.div`
  padding: 5px;
  font-weight: bold;
  text-transform: uppercase;
  background-color: gray;
  // background-color: #CEC;
`;
