import React from 'react';
import { useCurrentDatabase, useSetOpenedTabs } from '../utility/globalState';
import styled from 'styled-components';
import { openNewTab } from '../utility/common';
import axios from '../utility/axios';
import useTheme from '../theme/useTheme';

const StyledLink = styled.a`
  text-decoration: none;
  cursor: pointer;
  color: ${(props) => props.theme.main_background_blue[7]};
  &:hover {
    text-decoration: underline;
  }
`;

export default function OpenChartLink({ file, children }) {
  const setOpenedTabs = useSetOpenedTabs();
  const currentDb = useCurrentDatabase();
  const theme = useTheme();

  const handleClick = async () => {
    const resp = await axios.post('files/load', { folder: 'charts', file, format: 'json' });
    openNewTab(
      setOpenedTabs,
      {
        title: file,
        icon: 'img chart',
        tabComponent: 'ChartTab',
        props: {
          conid: currentDb && currentDb.connection && currentDb.connection._id,
          database: currentDb && currentDb.name,
        },
      },
      resp.data
    );
  };

  return (
    <StyledLink theme={theme} onClick={handleClick}>
      {children}
    </StyledLink>
  );
}
