<script context="module">
</script>

<script>
  import { createMultiLineFilter, parseFilter } from 'dbgate-filterparser';
  import splitterDrag from '../utility/splitterDrag';

  import FilterMultipleValuesModal from '../modals/FilterMultipleValuesModal.svelte';
  import { getFilterValueExpression } from 'dbgate-filterparser';

  import { showModal } from '../modals/modalTools';
  import SetFilterModal from '../modals/SetFilterModal.svelte';
  import keycodes from '../utility/keycodes';

  import DropDownButton from '../buttons/DropDownButton.svelte';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import DictionaryLookupModal from '../modals/DictionaryLookupModal.svelte';
  import ValueLookupModal from '../modals/ValueLookupModal.svelte';
  import { _t } from '../translations';

  export let isReadOnly = false;
  export let filterBehaviour;
  export let filter;
  export let setFilter;
  export let showResizeSplitter = false;
  export let onFocusGrid = null;
  export let onFocusGridHeader = null;
  export let onGetReference = null;
  export let foreignKey = null;
  export let conid = null;
  export let database = null;
  export let driver = null;
  export let jslid = null;
  export let passAllRows = null;
  export let customCommandIcon = null;
  export let onCustomCommand = null;
  export let customCommandTooltip = null;
  export let formatterFunction = null;
  export let filterDisabled = false;
  export let noMargin = false;

  export let pureName = null;
  export let schemaName = null;
  export let columnName = null;
  export let uniqueName = null;
  export let dataType = null;

  export let placeholder = 'Filter';

  let value;
  let isError;
  let isOk;
  let domInput;
  let isDisabled;

  $: if (onGetReference && domInput) onGetReference(domInput);

  function openFilterWindow(condition1) {
    showModal(SetFilterModal, { condition1, filterBehaviour, onFilter: setFilter });
  }

  const filterMultipleValues = () => {
    showModal(FilterMultipleValuesModal, {
      onFilter: (mode, text) => setFilter(createMultiLineFilter(mode, text)),
    });
  };

  function createMenu() {
    const res = [
      { onClick: () => setFilter(''), text: _t('filter.clear', { defaultMessage: 'Clear Filter' }) },
      {
        onClick: () => filterMultipleValues(),
        text: _t('filter.multipleValues', { defaultMessage: 'Filter multiple values' }),
      },
    ];

    if (filterBehaviour.supportEquals) {
      res.push(
        { onClick: () => openFilterWindow('='), text: _t('filter.equals', { defaultMessage: 'Equals...' }) },
        {
          onClick: () => openFilterWindow('<>'),
          text: _t('filter.doesNotEqual', { defaultMessage: 'Does Not Equal...' }),
        }
      );
    }

    if (filterBehaviour.supportExistsTesting) {
      res.push(
        { onClick: () => setFilter('EXISTS'), text: _t('filter.fieldExists', { defaultMessage: 'Field exists' }) },
        {
          onClick: () => setFilter('NOT EXISTS'),
          text: _t('filter.fieldDoesNotExist', { defaultMessage: 'Field does not exist' }),
        }
      );
    }

    if (filterBehaviour.supportNotEmptyArrayTesting) {
      res.push({
        onClick: () => setFilter('NOT EMPTY ARRAY'),
        text: _t('filter.arrayIsNotEmpty', { defaultMessage: 'Array is not empty' }),
      });
    }

    if (filterBehaviour.supportEmptyArrayTesting) {
      res.push({
        onClick: () => setFilter('EMPTY ARRAY'),
        text: _t('filter.arrayIsEmpty', { defaultMessage: 'Array is empty' }),
      });
    }

    if (filterBehaviour.supportNullTesting) {
      res.push(
        { onClick: () => setFilter('NULL'), text: _t('filter.isNull', { defaultMessage: 'Is Null' }) },
        { onClick: () => setFilter('NOT NULL'), text: _t('filter.isNotNull', { defaultMessage: 'Is Not Null' }) }
      );
    }

    if (filterBehaviour.supportEmpty) {
      res.push(
        {
          onClick: () => setFilter('EMPTY, NULL'),
          text: _t('filter.isEmptyOrNull', { defaultMessage: 'Is Empty Or Null' }),
        },
        {
          onClick: () => setFilter('NOT EMPTY NOT NULL'),
          text: _t('filter.hasNotEmptyValue', { defaultMessage: 'Has Not Empty Value' }),
        }
      );
    }

    if (filterBehaviour.supportNumberLikeComparison) {
      res.push(
        { divider: true },

        { onClick: () => openFilterWindow('>'), text: _t('filter.greaterThan', { defaultMessage: 'Greater Than...' }) },
        {
          onClick: () => openFilterWindow('>='),
          text: _t('filter.greaterThanOrEqualTo', { defaultMessage: 'Greater Than Or Equal To...' }),
        },
        { onClick: () => openFilterWindow('<'), text: _t('filter.lessThan', { defaultMessage: 'Less Than...' }) },
        {
          onClick: () => openFilterWindow('<='),
          text: _t('filter.lessThanOrEqualTo', { defaultMessage: 'Less Than Or Equal To...' }),
        }
      );
    }

    if (filterBehaviour.supportStringInclusion) {
      res.push(
        { divider: true },

        { onClick: () => openFilterWindow('+'), text: _t('filter.contains', { defaultMessage: 'Contains...' }) },
        {
          onClick: () => openFilterWindow('~'),
          text: _t('filter.doesNotContain', { defaultMessage: 'Does Not Contain...' }),
        },
        { onClick: () => openFilterWindow('^'), text: _t('filter.beginsWith', { defaultMessage: 'Begins With...' }) },
        {
          onClick: () => openFilterWindow('!^'),
          text: _t('filter.doesNotBeginWith', { defaultMessage: 'Does Not Begin With...' }),
        },
        { onClick: () => openFilterWindow('$'), text: _t('filter.endsWith', { defaultMessage: 'Ends With...' }) },
        {
          onClick: () => openFilterWindow('!$'),
          text: _t('filter.doesNotEndWith', { defaultMessage: 'Does Not End With...' }),
        }
      );
    }

    if (filterBehaviour.supportBooleanValues) {
      res.push(
        { onClick: () => setFilter('TRUE'), text: _t('filter.isTrue', { defaultMessage: 'Is True' }) },
        { onClick: () => setFilter('FALSE'), text: _t('filter.isFalse', { defaultMessage: 'Is False' }) }
      );
    }

    if (filterBehaviour.supportBooleanOrNull) {
      res.push(
        {
          onClick: () => setFilter('TRUE, NULL'),
          text: _t('filter.isTrueOrNull', { defaultMessage: 'Is True or NULL' }),
        },
        {
          onClick: () => setFilter('FALSE, NULL'),
          text: _t('filter.isFalseOrNull', { defaultMessage: 'Is False or NULL' }),
        }
      );
    }

    if (filterBehaviour.supportDatetimeSymbols) {
      res.push(
        { divider: true },

        { onClick: () => setFilter('TOMORROW'), text: _t('filter.tomorrow', { defaultMessage: 'Tomorrow' }) },
        { onClick: () => setFilter('TODAY'), text: _t('filter.today', { defaultMessage: 'Today' }) },
        { onClick: () => setFilter('YESTERDAY'), text: _t('filter.yesterday', { defaultMessage: 'Yesterday' }) },

        { divider: true },

        { onClick: () => setFilter('NEXT WEEK'), text: _t('filter.nextWeek', { defaultMessage: 'Next Week' }) },
        { onClick: () => setFilter('THIS WEEK'), text: _t('filter.thisWeek', { defaultMessage: 'This Week' }) },
        { onClick: () => setFilter('LAST WEEK'), text: _t('filter.lastWeek', { defaultMessage: 'Last Week' }) },

        { divider: true },

        { onClick: () => setFilter('NEXT MONTH'), text: _t('filter.nextMonth', { defaultMessage: 'Next Month' }) },
        { onClick: () => setFilter('THIS MONTH'), text: _t('filter.thisMonth', { defaultMessage: 'This Month' }) },
        { onClick: () => setFilter('LAST MONTH'), text: _t('filter.lastMonth', { defaultMessage: 'Last Month' }) },

        { divider: true },

        { onClick: () => setFilter('NEXT YEAR'), text: _t('filter.nextYear', { defaultMessage: 'Next Year' }) },
        { onClick: () => setFilter('THIS YEAR'), text: _t('filter.thisYear', { defaultMessage: 'This Year' }) },
        { onClick: () => setFilter('LAST YEAR'), text: _t('filter.lastYear', { defaultMessage: 'Last Year' }) }
      );
    }

    if (filterBehaviour.supportDatetimeComparison) {
      res.push(
        { divider: true },
        { onClick: () => openFilterWindow('<='), text: _t('filter.before', { defaultMessage: 'Before...' }) },
        { onClick: () => openFilterWindow('>='), text: _t('filter.after', { defaultMessage: 'After...' }) },
        { onClick: () => openFilterWindow('>=;<='), text: _t('filter.between', { defaultMessage: 'Between...' }) }
      );
    }

    if (filterBehaviour.supportSqlCondition) {
      res.push(
        { divider: true },
        {
          onClick: () => openFilterWindow('sql'),
          text: _t('filter.sqlCondition', { defaultMessage: 'SQL condition ...' }),
        },
        {
          onClick: () => openFilterWindow('sqlRight'),
          text: _t('filter.sqlConditionRight', { defaultMessage: 'SQL condition - right side ...' }),
        }
      );
    }

    return res;
  }

  const handleKeyDown = ev => {
    if (isReadOnly) return;
    if (ev.keyCode == keycodes.enter) {
      applyFilter();
    }
    if (ev.keyCode == keycodes.escape) {
      value = '';
      if (filter) {
        setFilter('');
      }
    }
    if (ev.keyCode == keycodes.downArrow) {
      if (onFocusGrid) onFocusGrid();
      // ev.stopPropagation();
      ev.preventDefault();
    }
    if (ev.keyCode == keycodes.upArrow) {
      if (onFocusGridHeader) onFocusGridHeader();
      // ev.stopPropagation();
      ev.preventDefault();
    }
    // if (ev.keyCode == KeyCodes.DownArrow || ev.keyCode == KeyCodes.UpArrow) {
    //     if (this.props.onControlKey) this.props.onControlKey(ev.keyCode);
    // }
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
      setFilter(createMultiLineFilter('is', pastedText));
    }
  }

  function handleShowDictionary() {
    showModal(DictionaryLookupModal, {
      conid,
      database,
      driver,
      pureName: foreignKey.refTableName,
      schemaName: foreignKey.refSchemaName,
      multiselect: true,
      dataType,
      onConfirm: keys => setFilter(keys.map(x => getFilterValueExpression(x, dataType)).join(',')),
    });
  }

  function handleShowValuesModal() {
    showModal(ValueLookupModal, {
      conid,
      database,
      driver,
      jslid,
      passAllRows,
      multiselect: true,
      schemaName,
      pureName,
      field: columnName || uniqueName,
      formatterFunction,
      dataType,
      onConfirm: keys => setFilter(keys.map(x => getFilterValueExpression(x, dataType)).join(',')),
    });
  }

  $: value = filter;

  $: {
    try {
      isOk = false;
      isError = false;
      isDisabled = filterDisabled;
      if (value) {
        parseFilter(value, filterBehaviour);
        isOk = true;
      }
    } catch (err) {
      // console.error(err);
      isError = true;
    }
  }

  function handleBlur(e) {
    if (isReadOnly) return;
    applyFilter();
  }

  function applyFilter() {
    if ((filter || '') == (value || '')) return;
    setFilter(value);
  }

  // $: if (value != filter) setFilter(value);
</script>

<div class="wrapper" class:isError class:isOk class:useMargin={!noMargin}>
  <input
    bind:this={domInput}
    type="text"
    autocomplete="off"
    readOnly={isReadOnly}
    bind:value
    on:keydown={handleKeyDown}
    on:blur={handleBlur}
    on:paste={handlePaste}
    class:isDisabled
    class:isError
    class:isOk
    {placeholder}
    data-testid={`DataFilterControl_input_${uniqueName}`}
  />
  {#if customCommandIcon && onCustomCommand}
    <InlineButton on:click={onCustomCommand} title={customCommandTooltip} narrow square>
      <FontIcon icon={customCommandIcon} />
    </InlineButton>
  {/if}
  {#if value}
    <InlineButton
      on:mousedown={() => {
        value = '';
        if (filter) {
          setFilter('');
        }
      }}
      narrow
      square
    >
      <FontIcon icon="icon close" />
    </InlineButton>
  {:else}
    {#if conid && database && driver}
      {#if driver?.databaseEngineTypes?.includes('sql') && foreignKey}
        <InlineButton
          on:click={handleShowDictionary}
          narrow
          square
          data-testid={`DataFilterControl_choosevalues_${uniqueName}`}
        >
          <FontIcon icon="icon dots-horizontal" />
        </InlineButton>
      {:else if (pureName && columnName) || (pureName && uniqueName && driver?.databaseEngineTypes?.includes('document'))}
        <InlineButton
          on:click={handleShowValuesModal}
          narrow
          square
          data-testid={`DataFilterControl_choosevalues_${uniqueName}`}
        >
          <FontIcon icon="icon dots-vertical" />
        </InlineButton>
      {/if}
    {:else if jslid || passAllRows}
      <InlineButton on:click={handleShowValuesModal} narrow square>
        <FontIcon icon="icon dots-vertical" />
      </InlineButton>
    {/if}
    <DropDownButton
      icon="icon filter"
      menu={createMenu}
      narrow
      data-testid={`DataFilterControl_filtermenu_${uniqueName}`}
    />
  {/if}
  {#if showResizeSplitter}
    <div class="horizontal-split-handle resizeHandleControl" use:splitterDrag={'clientX'} on:resizeSplitter />
  {/if}
</div>

<style>
  .wrapper {
    display: flex;
    align-items: center;
    gap: 2px;
    background-color: var(--theme-datagrid-filter-background);
  }
  .wrapper.useMargin {
    border: var(--theme-datagrid-filter-border);
    border-radius: 4px;
    margin: 2px 3px;
  }
  input {
    flex: 1;
    min-width: 10px;
    width: 1px;
    background-color: var(--theme-datagrid-filter-background);
    border: none;
    outline: none;
  }

  .isError {
    background-color: var(--theme-datagrid-filter-error-background);
  }

  .isOk {
    background-color: var(--theme-datagrid-filter-ok-background);
  }

  input.isDisabled {
    text-decoration: line-through;
  }
</style>
