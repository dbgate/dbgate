// @ts-nocheck
import React from 'react';
import { DropDownMenuItem, DropDownMenuDivider, showMenu } from '../modals/DropDownMenu';
import styled from 'styled-components';
import keycodes from '../utility/keycodes';
import { parseFilter, createMultiLineFilter } from '@dbgate/filterparser';
import InlineButton from '../widgets/InlineButton';
import showModal from '../modals/showModal';
import FilterMultipleValuesModal from '../modals/FilterMultipleValuesModal';
import SetFilterModal from '../modals/SetFilterModal';
// import { $ } from '../../Utility/jquery';
// import autobind from 'autobind-decorator';
// import * as React from 'react';

// import { createMultiLineFilter } from '../../DataLib/FilterTools';
// import { ModalDialog } from '../Dialogs';
// import { FilterDialog } from '../Dialogs/FilterDialog';
// import { FilterMultipleValuesDialog } from '../Dialogs/FilterMultipleValuesDialog';
// import { IconSpan } from '../Navigation/NavUtils';
// import { KeyCodes } from '../ReactDataGrid/KeyCodes';
// import { DropDownMenu, DropDownMenuDivider, DropDownMenuItem, DropDownSubmenuItem } from './DropDownMenu';
// import { FilterParserType } from '../../SwaggerClients';
// import { IFilterHolder } from '../CommonControls';
// import { GrayFilterIcon } from '../Icons';

// export interface IDataFilterControlProps {
//     filterType: FilterParserType;
//     getFilter: Function;
//     setFilter: Function;
//     width: number;
//     onControlKey?: Function;
//     isReadOnly?: boolean;
//     inputElementId?: string;
// }

const FilterDiv = styled.div`
  display: flex;
`;
const FilterInput = styled.input`
  flex: 1;
  min-width: 10px;
  background-color: ${(props) => (props.state == 'ok' ? '#CCFFCC' : props.state == 'error' ? '#FFCCCC' : 'white')};
`;
// const FilterButton = styled.button`
//   color: gray;
// `;

function DropDownContent({ filterType, setFilter, filterMultipleValues, openFilterWindow }) {
  switch (filterType) {
    case 'number':
      return (
        <>
          <DropDownMenuItem onClick={(x) => setFilter('')}>Clear Filter</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => filterMultipleValues()}>Filter multiple values</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('=')}>Equals...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('<>')}>Does Not Equal...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('NULL')}>Is Null</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('NOT NULL')}>Is Not Null</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('>')}>Greater Than...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('>=')}>Greater Than Or Equal To...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('<')}>Less Than...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('<=')}>Less Than Or Equal To...</DropDownMenuItem>
        </>
      );
    case 'logical':
      return (
        <>
          <DropDownMenuItem onClick={(x) => setFilter('')}>Clear Filter</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => filterMultipleValues()}>Filter multiple values</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('NULL')}>Is Null</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('NOT NULL')}>Is Not Null</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('TRUE')}>Is True</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('FALSE')}>Is False</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('TRUE, NULL')}>Is True or NULL</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('FALSE, NULL')}>Is False or NULL</DropDownMenuItem>
        </>
      );
    case 'datetime':
      return (
        <>
          <DropDownMenuItem onClick={(x) => setFilter('')}>Clear Filter</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => filterMultipleValues()}>Filter multiple values</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('NULL')}>Is Null</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('NOT NULL')}>Is Not Null</DropDownMenuItem>

          <DropDownMenuDivider />

          <DropDownMenuItem onClick={(x) => openFilterWindow('<=')}>Before...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('>=')}>After...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('>=;<=')}>Between...</DropDownMenuItem>

          <DropDownMenuDivider />

          <DropDownMenuItem onClick={(x) => setFilter('TOMORROW')}>Tomorrow</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('TODAY')}>Today</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('YESTERDAY')}>Yesterday</DropDownMenuItem>

          <DropDownMenuDivider />

          <DropDownMenuItem onClick={(x) => setFilter('NEXT WEEK')}>Next Week</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('THIS WEEK')}>This Week</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('LAST WEEK')}>Last Week</DropDownMenuItem>

          <DropDownMenuDivider />

          <DropDownMenuItem onClick={(x) => setFilter('NEXT MONTH')}>Next Month</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('THIS MONTH')}>This Month</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('LAST MONTH')}>Last Month</DropDownMenuItem>

          <DropDownMenuDivider />

          <DropDownMenuItem onClick={(x) => setFilter('NEXT YEAR')}>Next Year</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('THIS YEAR')}>This Year</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('LAST YEAR')}>Last Year</DropDownMenuItem>

          <DropDownMenuDivider />

          {/* <DropDownSubmenuItem title="All dates in period">
              <DropDownMenuItem onClick={x => setFilter('JAN')}>January</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('FEB')}>February</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('MAR')}>March</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('APR')}>April</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('JUN')}>June</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('JUL')}>July</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('AUG')}>August</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('SEP')}>September</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('OCT')}>October</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('NOV')}>November</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('DEC')}>December</DropDownMenuItem>

              <DropDownMenuDivider />

              <DropDownMenuItem onClick={x => setFilter('MON')}>Monday</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('TUE')}>Tuesday</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('WED')}>Wednesday</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('THU')}>Thursday</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('FRI')}>Friday</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('SAT')}>Saturday</DropDownMenuItem>
              <DropDownMenuItem onClick={x => setFilter('SUN')}>Sunday</DropDownMenuItem>
            </DropDownSubmenuItem> */}
        </>
      );
    case 'string':
      return (
        <>
          <DropDownMenuItem onClick={(x) => setFilter('')}>Clear Filter</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => filterMultipleValues()}>Filter multiple values</DropDownMenuItem>

          <DropDownMenuItem onClick={(x) => openFilterWindow('=')}>Equals...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('<>')}>Does Not Equal...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('NULL')}>Is Null</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('NOT NULL')}>Is Not Null</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('EMPTY, NULL')}>Is Empty Or Null</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => setFilter('NOT EMPTY NOT NULL')}>Has Not Empty Value</DropDownMenuItem>

          <DropDownMenuDivider />

          <DropDownMenuItem onClick={(x) => openFilterWindow('+')}>Contains...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('~')}>Does Not Contain...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('^')}>Begins With...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('!^')}>Does Not Begin With...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('$')}>Ends With...</DropDownMenuItem>
          <DropDownMenuItem onClick={(x) => openFilterWindow('!$')}>Does Not End With...</DropDownMenuItem>
        </>
      );
  }
}

export default function DataFilterControl({ isReadOnly = false, filterType, filter, setFilter }) {
  const [filterState, setFilterState] = React.useState('empty');
  const setFilterText = (filter) => {
    setFilter(filter);
    editorRef.current.value = filter || '';
    updateFilterState();
  };
  const applyFilter = () => {
    if ((filter || '') == (editorRef.current.value || '')) return;
    setFilter(editorRef.current.value);
  };
  const filterMultipleValues = () => {
    showModal((modalState) => (
      <FilterMultipleValuesModal
        modalState={modalState}
        onFilter={(mode, text) => setFilterText(createMultiLineFilter(mode, text))}
      />
    ));
  };
  const openFilterWindow = (operator) => {
    showModal((modalState) => (
      <SetFilterModal
        filterType={filterType}
        modalState={modalState}
        onFilter={(text) => setFilterText(text)}
        condition1={operator}
      />
    ));
  };
  const buttonRef = React.useRef();
  const editorRef = React.useRef();

  const handleKeyDown = (ev) => {
    if (isReadOnly) return;
    if (ev.keyCode == keycodes.enter) {
      applyFilter();
    }
    if (ev.keyCode == keycodes.escape) {
      setFilterText('');
    }
    // if (ev.keyCode == KeyCodes.DownArrow || ev.keyCode == KeyCodes.UpArrow) {
    //     if (this.props.onControlKey) this.props.onControlKey(ev.keyCode);
    // }
  };

  const updateFilterState = () => {
    const value = editorRef.current.value;
    try {
      if (value) {
        parseFilter(value, filterType);
        setFilterState('ok');
      } else {
        setFilterState('empty');
      }
    } catch (err) {
      setFilterState('error');
    }
  };

  React.useEffect(() => {
    editorRef.current.value = filter || '';
    updateFilterState();
  }, [filter]);

  const handleShowMenu = () => {
    const rect = buttonRef.current.getBoundingClientRect();
    showMenu(
      rect.left,
      rect.bottom,
      <DropDownContent
        filterType={filterType}
        setFilter={setFilterText}
        filterMultipleValues={filterMultipleValues}
        openFilterWindow={openFilterWindow}
      />
    );
  };

  function handlePaste(event) {
    var pastedText = undefined;
    // @ts-ignore
    if (window.clipboardData && window.clipboardData.getData) {
      // IE
      // @ts-ignore
      pastedText = window.clipboardData.getData('Text');
    } else if (event.clipboardData && event.clipboardData.getData) {
      pastedText = event.clipboardData.getData('text/plain');
    }
    if (pastedText && pastedText.includes('\n')) {
      event.preventDefault();
      setFilterText(createMultiLineFilter('is', pastedText));
    }
  }

  return (
    <FilterDiv>
      <FilterInput
        ref={editorRef}
        onKeyDown={handleKeyDown}
        type="text"
        readOnly={isReadOnly}
        onChange={updateFilterState}
        state={filterState}
        onBlur={applyFilter}
        onPaste={handlePaste}
      />
      <InlineButton buttonRef={buttonRef} onClick={handleShowMenu} square>
        <i className="fas fa-filter" />
      </InlineButton>
    </FilterDiv>
  );
}
//     domEditor: Element;

//     @autobind
//     applyFilter() {
//         this.props.setFilter($(this.domEditor).val());
//     }

//     @autobind
//     clearFilter() {
//         $(this.domEditor).val('');
//         this.applyFilter();
//     }

//     setFilter(value: string) {
//         $(this.domEditor).val(value);
//         this.applyFilter();
//         return false;
//     }

//     render() {
//         let dropDownContent = null;

//         let filterIconSpan = <span className='fa fa-filter' style={{color: 'gray', display: 'inline-block', width: '8px', height: '0', whiteSpace: 'nowrap'}} ></span>;
//         //filterIconSpan = null;

//         if (this.props.filterType == 'Number') {
//             dropDownContent = <DropDownMenu iconSpan={filterIconSpan}>
//                 <DropDownMenuItem onClick={x => this.setFilter('')}>Clear Filter</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.filterMultipleValues()}>Filter multiple values</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.openFilterWindow('=')}>Equals...</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.openFilterWindow('<>')}>Does Not Equal...</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.setFilter('NULL')}>Is Null</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.setFilter('NOT NULL')}>Is Not Null</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.openFilterWindow('>')}>Greater Than...</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.openFilterWindow('>=')}>Greater Than Or Equal To...</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.openFilterWindow('<')}>Less Than...</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.openFilterWindow('<=')}>Less Than Or Equal To...</DropDownMenuItem>
//             </DropDownMenu>;
//         }

//         if (this.props.filterType == 'Logical') {
//             dropDownContent = <DropDownMenu iconSpan={filterIconSpan}>
//                 <DropDownMenuItem onClick={x => this.setFilter('')}>Clear Filter</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.filterMultipleValues()}>Filter multiple values</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.setFilter('NULL')}>Is Null</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.setFilter('NOT NULL')}>Is Not Null</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.setFilter('TRUE')}>Is True</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.setFilter('FALSE')}>Is False</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.setFilter('TRUE, NULL')}>Is True or NULL</DropDownMenuItem>
//                 <DropDownMenuItem onClick={x => this.setFilter('FALSE, NULL')}>Is False or NULL</DropDownMenuItem>
//             </DropDownMenu>;
//         }

//         if (this.props.filterType == 'DateTime') {
//             dropDownContent = <DropDownMenu iconSpan={filterIconSpan}>
// <DropDownMenuItem onClick={x => this.setFilter('')}>Clear Filter</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.filterMultipleValues()}>Filter multiple values</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('NULL')}>Is Null</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('NOT NULL')}>Is Not Null</DropDownMenuItem>

// <DropDownMenuDivider />

// <DropDownMenuItem onClick={x => this.openFilterWindow('<=')}>Before...</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.openFilterWindow('>=')}>After...</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.openFilterWindow('>=;<=')}>Between...</DropDownMenuItem>

// <DropDownMenuDivider />

// <DropDownMenuItem onClick={x => this.setFilter('TOMORROW')}>Tomorrow</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('TODAY')}>Today</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('YESTERDAY')}>Yesterday</DropDownMenuItem>

// <DropDownMenuDivider />

// <DropDownMenuItem onClick={x => this.setFilter('NEXT WEEK')}>Next Week</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('THIS WEEK')}>This Week</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('LAST WEEK')}>Last Week</DropDownMenuItem>

// <DropDownMenuDivider />

// <DropDownMenuItem onClick={x => this.setFilter('NEXT MONTH')}>Next Month</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('THIS MONTH')}>This Month</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('LAST MONTH')}>Last Month</DropDownMenuItem>

// <DropDownMenuDivider />

// <DropDownMenuItem onClick={x => this.setFilter('NEXT YEAR')}>Next Year</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('THIS YEAR')}>This Year</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('LAST YEAR')}>Last Year</DropDownMenuItem>

// <DropDownMenuDivider />

// <DropDownSubmenuItem title='All dates in period'>

//     <DropDownMenuItem onClick={x => this.setFilter('JAN')}>January</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('FEB')}>February</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('MAR')}>March</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('APR')}>April</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('JUN')}>June</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('JUL')}>July</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('AUG')}>August</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('SEP')}>September</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('OCT')}>October</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('NOV')}>November</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('DEC')}>December</DropDownMenuItem>

//     <DropDownMenuDivider />

//     <DropDownMenuItem onClick={x => this.setFilter('MON')}>Monday</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('TUE')}>Tuesday</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('WED')}>Wednesday</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('THU')}>Thursday</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('FRI')}>Friday</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('SAT')}>Saturday</DropDownMenuItem>
//     <DropDownMenuItem onClick={x => this.setFilter('SUN')}>Sunday</DropDownMenuItem>

// </DropDownSubmenuItem>
//             </DropDownMenu>;
//         }

//         if (this.props.filterType == 'String') {
//             dropDownContent = <DropDownMenu iconSpan={filterIconSpan}>
// <DropDownMenuItem onClick={x => this.setFilter('')}>Clear Filter</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.filterMultipleValues()}>Filter multiple values</DropDownMenuItem>

// <DropDownMenuItem onClick={x => this.openFilterWindow('=')}>Equals...</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.openFilterWindow('<>')}>Does Not Equal...</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('NULL')}>Is Null</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('NOT NULL')}>Is Not Null</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('EMPTY, NULL')}>Is Empty Or Null</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.setFilter('NOT EMPTY NOT NULL')}>Has Not Empty Value</DropDownMenuItem>

// <DropDownMenuDivider />

// <DropDownMenuItem onClick={x => this.openFilterWindow('+')}>Contains...</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.openFilterWindow('~')}>Does Not Contain...</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.openFilterWindow('^')}>Begins With...</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.openFilterWindow('!^')}>Does Not Begin With...</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.openFilterWindow('$')}>Ends With...</DropDownMenuItem>
// <DropDownMenuItem onClick={x => this.openFilterWindow('!$')}>Does Not End With...</DropDownMenuItem>
//             </DropDownMenu>;
//         }

//         if (this.props.isReadOnly) {
//             dropDownContent = <GrayFilterIcon style={{marginLeft: '5px'}} />;
//         }

//         return <div style={{ minWidth: `${this.props.width}px`, maxWidth: `${this.props.width}px`, width: `${this.props.width}` }}>
//                 <input id={this.props.inputElementId} type='text' style={{ 'width': `${(this.props.width - 20)}px` }} readOnly={this.props.isReadOnly}
//                     onBlur={this.applyFilter} ref={x => this.setDomEditor(x)} onKeyDown={this.editorKeyDown} placeholder='Search' ></input>

//                 {dropDownContent}
//             </div>;
//     }

//     async filterMultipleValues() {
//         let result = await ModalDialog.run(<FilterMultipleValuesDialog header='Filter multiple values' />);
//         if (!result) return;
//         let { mode, text } = result;
//         let filter = createMultiLineFilter(mode, text);
//         this.setFilter(filter);
//     }

//     openFilterWindow(selectedOperator: string) {
//         FilterDialog.runFilter(this, this.props.filterType, selectedOperator);
//         return false;
//     }

//     setDomEditor(editor) {
//         this.domEditor = editor;
//         $(editor).val(this.props.getFilter());
//     }

//     @autobind
//     editorKeyDown(ev) {
//         if (this.props.isReadOnly) return;
//         if (ev.keyCode == KeyCodes.Enter) {
//             this.applyFilter();
//         }
//         if (ev.keyCode == KeyCodes.Escape) {
//             this.clearFilter();
//         }
//         if (ev.keyCode == KeyCodes.DownArrow || ev.keyCode == KeyCodes.UpArrow) {
//             if (this.props.onControlKey) this.props.onControlKey(ev.keyCode);
//         }
//     }

//     focus() {
//         $(this.domEditor).focus();
//     }
// }
