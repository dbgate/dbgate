import React from 'react';
import styled from 'styled-components';
import moment from 'moment';

const MainContainer = styled.div`
  flex:1
  display:flex
  overflow-y: scroll
`;

const StyledTable = styled.table`
  flex: 1;
  border-spacing: 0;
  border-collapse: collapse;
`;

const StyledHeader = styled.th`
  text-align: left;
  border-bottom: 2px solid #ddd;
  padding: 5px;
`;

const StyledCell = styled.td`
  border-top: 1px solid #ddd;
  padding: 5px;
`;

const StyledRow = styled.tr`
  color: ${(props) =>
    // @ts-ignore
    props.severity == 'error' ? 'red' : 'black'};

  ${(props) =>
    // @ts-ignore
    props.line != null &&
    `
  &:hover {
    background-color: #ccc;
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

export default function MessagesView({ items, onMessageClick }) {
  const handleClick = (row) => {
    if (onMessageClick) onMessageClick(row);
  };

  const mainDiv = React.useRef(null);

  React.useEffect(() => {
    const element = mainDiv.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [items]);

  const time0 = items[0] && new Date(items[0].time).getTime();

  return (
    <MainContainer ref={mainDiv}>
      <StyledTable>
        <tr>
          <StyledHeader>Number</StyledHeader>
          <StyledHeader>Message</StyledHeader>
          <StyledHeader>Time</StyledHeader>
          <StyledHeader>Delta</StyledHeader>
          <StyledHeader>Duration</StyledHeader>
          <StyledHeader>Procedure</StyledHeader>
          <StyledHeader>Line</StyledHeader>
        </tr>
        {items.map((row, index) => (
          // @ts-ignore
          <StyledRow key={index} severity={row.severity} line={row.line} onClick={() => handleClick(row)}>
            <StyledCell>{index + 1}</StyledCell>
            <StyledCell>{row.message}</StyledCell>
            <StyledCell>{moment(row.time).format('HH:mm:ss')}</StyledCell>
            <StyledCell>{formatDuration(new Date(row.time).getTime() - time0)}</StyledCell>
            <StyledCell>
              {index > 0
                ? formatDuration(new Date(row.time).getTime() - new Date(items[index - 1].time).getTime())
                : 'n/a'}
            </StyledCell>
            <StyledCell>{row.procedure}</StyledCell>
            <StyledCell>{row.line}</StyledCell>
          </StyledRow>
        ))}
      </StyledTable>
    </MainContainer>
  );
}
