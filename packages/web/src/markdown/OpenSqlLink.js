import React from 'react';
import axios from '../utility/axios';
import useTheme from '../theme/useTheme';
import { StyledThemedLink } from '../widgets/FormStyledButton';
import useNewQuery from '../query/useNewQuery';

export default function OpenSqlLink({ file, children }) {
  const newQuery = useNewQuery();
  const theme = useTheme();

  const handleClick = async () => {
    const resp = await axios.post('files/load', { folder: 'sql', file, format: 'text' });
    newQuery({
      title: file,
      initialData: resp.data,
      // @ts-ignore
      savedFile: file,
    });
  };

  return (
    <StyledThemedLink theme={theme} onClick={handleClick}>
      {children}
    </StyledThemedLink>
  );
}
