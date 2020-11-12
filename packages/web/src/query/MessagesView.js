import React from 'react';
import styled from 'styled-components';
import moment from 'moment';
import useTheme from '../theme/useTheme';

const MainContainer = styled.div`
  flex: 1;
  display: flex;
  overflow-y: scroll;
  background-color: ${(props) => props.theme.gridbody_background};
`;

const StyledTable = styled.table`
  flex: 1;
  border-spacing: 0;
  border-collapse: collapse;
`;

const StyledHeader = styled.td`
  text-align: left;
  border-bottom: 2px solid ${(props) => props.theme.border};
  background-color: ${(props) => props.theme.gridheader_background};
  padding: 5px;
`;

const StyledCell = styled.td`
  border-top: 1px solid ${(props) => props.theme.border};
  padding: 5px;
`;

const StyledRow = styled.tr`
  color: ${(props) =>
    // @ts-ignore
    props.severity == 'error' ? props.theme.gridbody_font_red[5] : props.theme.gridbody_font1};

  ${(props) =>
    // @ts-ignore
    props.line != null &&
    `
  &:hover {
    background-color: ${props.theme.gridbody_background2};
  }
  `}
`;

function formatDuration(duration) {
  if (duration == 0) return '0';
  if (duration < 1000) {
    return `${Math.round(duration)} ms`;
  }
  if (duration < 10000) {
    return `${Math.round(duration / 100) / 10} s`;
  }
  return `${Math.round(duration / 1000)} s`;
}

function MessagesView({ items, onMessageClick, showProcedure = false, showLine = false }) {
  const handleClick = (row) => {
    if (onMessageClick) onMessageClick(row);
  };
  const theme = useTheme();

  const mainDiv = React.useRef(null);

  React.useEffect(() => {
    const element = mainDiv.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [items]);

  const time0 = items[0] && new Date(items[0].time).getTime();

  return (
    <MainContainer ref={mainDiv} theme={theme}>
      <StyledTable theme={theme}>
        <tr>
          <StyledHeader theme={theme}>Number</StyledHeader>
          <StyledHeader theme={theme}>Message</StyledHeader>
          <StyledHeader theme={theme}>Time</StyledHeader>
          <StyledHeader theme={theme}>Delta</StyledHeader>
          <StyledHeader theme={theme}>Duration</StyledHeader>
          {showProcedure && <StyledHeader theme={theme}>Procedure</StyledHeader>}
          {showLine && <StyledHeader theme={theme}>Line</StyledHeader>}
        </tr>
        {items.map((row, index) => (
          // @ts-ignore
          <StyledRow key={index} severity={row.severity} line={row.line} onClick={() => handleClick(row)} theme={theme}>
            <StyledCell theme={theme}>{index + 1}</StyledCell>
            <StyledCell theme={theme}>{row.message}</StyledCell>
            <StyledCell theme={theme}>{moment(row.time).format('HH:mm:ss')}</StyledCell>
            <StyledCell theme={theme}>{formatDuration(new Date(row.time).getTime() - time0)}</StyledCell>
            <StyledCell theme={theme}>
              {index > 0
                ? formatDuration(new Date(row.time).getTime() - new Date(items[index - 1].time).getTime())
                : 'n/a'}
            </StyledCell>
            {showProcedure && <StyledCell theme={theme}>{row.procedure}</StyledCell>}
            {showLine && <StyledCell theme={theme}>{row.line}</StyledCell>}
          </StyledRow>
        ))}
      </StyledTable>
    </MainContainer>
  );
}

export default React.memo(MessagesView);
