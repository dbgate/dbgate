import styled from 'styled-components';
import _ from 'lodash';
import React from 'react';
import { ManagerInnerContainer } from '../datagrid/ManagerStyles';
import SearchInput from '../widgets/SearchInput';
import { WidgetTitle } from '../widgets/WidgetStyles';
import macros from './macros';
import { AppObjectList } from '../appobj/AppObjectList';
import MacroAppObject from '../appobj/MacroAppObject';

const SearchBoxWrapper = styled.div`
  display: flex;
  margin-bottom: 5px;
`;

export default function MacroManager({ managerSize, selectedMacro, setSelectedMacro }) {
  const [filter, setFilter] = React.useState('');

  return (
    <>
      <ManagerInnerContainer style={{ maxWidth: managerSize }}>
        <SearchBoxWrapper>
          <SearchInput placeholder="Search macros" filter={filter} setFilter={setFilter} />
        </SearchBoxWrapper>
        <AppObjectList
          list={_.sortBy(macros, 'title')}
          AppObjectComponent={MacroAppObject}
          onObjectClick={macro => setSelectedMacro(macro)}
          getCommonProps={data => ({
            isBold: selectedMacro && selectedMacro.name == data.name,
          })}
          filter={filter}
          groupFunc={data => data.group}
        />
        {/* {macros.map((macro) => (
          <MacroListItem key={`${macro.group}/${macro.name}`} macro={macro} />
        ))} */}
      </ManagerInnerContainer>
    </>
  );
}
