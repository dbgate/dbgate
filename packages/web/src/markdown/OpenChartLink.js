import React from 'react';
import { useCurrentDatabase, useSetOpenedTabs } from '../utility/globalState';
import { openNewTab } from '../utility/common';
import axios from '../utility/axios';
import useTheme from '../theme/useTheme';
import { StyledThemedLink } from '../widgets/FormStyledButton';

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
    <StyledThemedLink theme={theme} onClick={handleClick}>
      {children}
    </StyledThemedLink>
  );
}
