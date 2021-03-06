import React from 'react';
import styled from 'styled-components';
import TableControl, { TableColumn } from './TableControl';
// import { AppObjectControl } from '../appobj/AppObjects';
import useTheme from '../theme/useTheme';

const ObjectListWrapper = styled.div`
  margin-bottom: 20px;
`;

const ObjectListHeader = styled.div`
  background-color: ${props => props.theme.gridheader_background};
  padding: 5px;
`;

const ObjectListHeaderTitle = styled.span`
  font-weight: bold;
  margin-left: 5px;
`;

const ObjectListBody = styled.div`
  margin: 20px;
  //   margin-left: 20px;
  //   margin-right: 20px;
  //   margin-top: 3px;
`;

export default function ObjectListControl({ collection = [], title, showIfEmpty = false, NameComponent, children }) {
  const theme = useTheme();
  if (collection.length == 0 && !showIfEmpty) return null;

  return (
    <ObjectListWrapper>
      <ObjectListHeader theme={theme}>
        <ObjectListHeaderTitle>{title}</ObjectListHeaderTitle>
      </ObjectListHeader>
      <ObjectListBody>
        <TableControl rows={collection}>
          <TableColumn fieldName="displayName" header="Name" formatter={data => <NameComponent data={data} />} />
          {children}
        </TableControl>
      </ObjectListBody>
    </ObjectListWrapper>
  );
}
