import styled from 'styled-components';
import _ from 'lodash';
import React from 'react';
import { ManagerInnerContainer } from '../datagrid/ManagerStyles';
import SearchInput from '../widgets/SearchInput';
import { WidgetTitle } from '../widgets/WidgetStyles';
import macros from './macros';
import { AppObjectList } from '../appobj/AppObjectList';
import macroAppObject from '../appobj/MacroAppObject';

const SearchBoxWrapper = styled.div`
  display: flex;
  margin-bottom: 5px;
`;

// const MacroItemStyled = styled.div`
//   white-space: nowrap;
//   padding: 5px;
//   &:hover {
//     background-color: lightblue;
//   }
// `;

// function MacroListItem({ macro }) {
//   return <MacroItemStyled>{macro.title}</MacroItemStyled>;
// }

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
          makeAppObj={macroAppObject()}
          onObjectClick={(macro) => setSelectedMacro(macro)}
          filter={filter}
          groupFunc={(appobj) => appobj.groupTitle}
        />
        {/* {macros.map((macro) => (
          <MacroListItem key={`${macro.group}/${macro.name}`} macro={macro} />
        ))} */}
      </ManagerInnerContainer>
    </>
  );
}
