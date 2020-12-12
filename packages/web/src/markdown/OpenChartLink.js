import React from 'react';
import { useCurrentDatabase } from '../utility/globalState';
import axios from '../utility/axios';
import useTheme from '../theme/useTheme';
import { StyledThemedLink } from '../widgets/FormStyledButton';
import useOpenNewTab from '../utility/useOpenNewTab';

export default function OpenChartLink({ file, children }) {
  const openNewTab = useOpenNewTab();
  const currentDb = useCurrentDatabase();
  const theme = useTheme();

  const handleClick = async () => {
    const resp = await axios.post('files/load', { folder: 'charts', file, format: 'json' });
    openNewTab(
      {
        title: file,
        icon: 'img chart',
        tabComponent: 'ChartTab',
        props: {
          conid: currentDb && currentDb.connection && currentDb.connection._id,
          database: currentDb && currentDb.name,
          savedFile: file,
        },
      },
      { editor: resp.data }
    );
  };

  return (
    <StyledThemedLink theme={theme} onClick={handleClick}>
      {children}
    </StyledThemedLink>
  );
}
