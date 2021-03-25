<script context="module">
</script>

<script>
  import { createMultiLineFilter, parseFilter } from 'dbgate-filterparser';
  import splitterDrag from '../utility/splitterDrag';

  import FilterMultipleValuesModal from '../modals/FilterMultipleValuesModal.svelte';

  import { showModal } from '../modals/modalTools';
  import SetFilterModal from '../modals/SetFilterModal.svelte';
  import keycodes from '../utility/keycodes';

  import DropDownButton from '../elements/DropDownButton.svelte';

  export let isReadOnly = false;
  export let filterType;
  export let filter;
  export let setFilter;
  export let showResizeSplitter = false;
  export let onFocusGrid;
  export let onGetReference;

  let value;
  let isError;
  let isOk;
  let domInput;

  $: if (onGetReference && domInput) onGetReference(domInput);

  function openFilterWindow(condition1) {
    showModal(SetFilterModal, { condition1, filterType, onFilter: setFilter });
  }

  const filterMultipleValues = () => {
    showModal(FilterMultipleValuesModal, {
      onFilter: (mode, text) => setFilter(createMultiLineFilter(mode, text)),
    });
  };

  function createMenu() {
    switch (filterType) {
      case 'number':
        return [
          { onClick: () => setFilter(''), text: 'Clear Filter' },
          { onClick: () => filterMultipleValues(), text: 'Filter multiple values' },
          { onClick: () => openFilterWindow('='), text: 'Equals...' },
          { onClick: () => openFilterWindow('['), text: 'Does Not Equal...' },
          { onClick: () => setFilter('NULL'), text: 'Is Null' },
          { onClick: () => setFilter('NOT NULL'), text: 'Is Not Null' },
          { onClick: () => openFilterWindow('>'), text: 'Greater Than...' },
          { onClick: () => openFilterWindow('>='), text: 'Greater Than Or Equal To...' },
          { onClick: () => openFilterWindow('<'), text: 'Less Than...' },
          { onClick: () => openFilterWindow('<='), text: 'Less Than Or Equal To...' },
        ];
      case 'logical':
        return [
          { onClick: () => setFilter(''), text: 'Clear Filter' },
          { onClick: () => filterMultipleValues(), text: 'Filter multiple values' },
          { onClick: () => setFilter('NULL'), text: 'Is Null' },
          { onClick: () => setFilter('NOT NULL'), text: 'Is Not Null' },
          { onClick: () => setFilter('TRUE'), text: 'Is True' },
          { onClick: () => setFilter('FALSE'), text: 'Is False' },
          { onClick: () => setFilter('TRUE, NULL'), text: 'Is True or NULL' },
          { onClick: () => setFilter('FALSE, NULL'), text: 'Is False or NULL' },
        ];
      case 'datetime':
        return [
          { onClick: () => setFilter(''), text: 'Clear Filter' },
          { onClick: () => filterMultipleValues(), text: 'Filter multiple values' },
          { onClick: () => setFilter('NULL'), text: 'Is Null' },
          { onClick: () => setFilter('NOT NULL'), text: 'Is Not Null' },

          { divider: true },

          { onClick: () => openFilterWindow('<='), text: 'Before...' },
          { onClick: () => openFilterWindow('>='), text: 'After...' },
          { onClick: () => openFilterWindow('>=;<='), text: 'Between...' },

          { divider: true },

          { onClick: () => setFilter('TOMORROW'), text: 'Tomorrow' },
          { onClick: () => setFilter('TODAY'), text: 'Today' },
          { onClick: () => setFilter('YESTERDAY'), text: 'Yesterday' },

          { divider: true },

          { onClick: () => setFilter('NEXT WEEK'), text: 'Next Week' },
          { onClick: () => setFilter('THIS WEEK'), text: 'This Week' },
          { onClick: () => setFilter('LAST WEEK'), text: 'Last Week' },

          { divider: true },

          { onClick: () => setFilter('NEXT MONTH'), text: 'Next Month' },
          { onClick: () => setFilter('THIS MONTH'), text: 'This Month' },
          { onClick: () => setFilter('LAST MONTH'), text: 'Last Month' },

          { divider: true },

          { onClick: () => setFilter('NEXT YEAR'), text: 'Next Year' },
          { onClick: () => setFilter('THIS YEAR'), text: 'This Year' },
          { onClick: () => setFilter('LAST YEAR'), text: 'Last Year' },

          { divider: true },
        ];
      case 'string':
        return [
          { onClick: () => setFilter(''), text: 'Clear Filter' },
          { onClick: () => filterMultipleValues(), text: 'Filter multiple values' },

          { onClick: () => openFilterWindow('='), text: 'Equals...' },
          { onClick: () => openFilterWindow('['), text: 'Does Not Equal...' },
          { onClick: () => setFilter('NULL'), text: 'Is Null' },
          { onClick: () => setFilter('NOT NULL'), text: 'Is Not Null' },
          { onClick: () => setFilter('EMPTY, NULL'), text: 'Is Empty Or Null' },
          { onClick: () => setFilter('NOT EMPTY NOT NULL'), text: 'Has Not Empty Value' },

          { divider: true },

          { onClick: () => openFilterWindow('+'), text: 'Contains...' },
          { onClick: () => openFilterWindow('~'), text: 'Does Not Contain...' },
          { onClick: () => openFilterWindow('^'), text: 'Begins With...' },
          { onClick: () => openFilterWindow('!^'), text: 'Does Not Begin With...' },
          { onClick: () => openFilterWindow('$'), text: 'Ends With...' },
          { onClick: () => openFilterWindow('!$'), text: 'Does Not End With...' },
        ];
    }

    // return [
    //   { text: 'Clear filter', onClick: () => (value = '') },
    //   { text: 'Is Null', onClick: () => (value = 'NULL') },
    //   { text: 'Is Not Null', onClick: () => (value = 'NOT NULL') },
    // ];
  }

  const handleKeyDown = ev => {
    if (isReadOnly) return;
    if (ev.keyCode == keycodes.enter) {
      applyFilter();
    }
    if (ev.keyCode == keycodes.escape) {
      setFilter('');
    }
    if (ev.keyCode == keycodes.downArrow) {
      if (onFocusGrid) onFocusGrid();
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

  $: value = filter;

  $: {
    try {
      isOk = false;
      isError = false;
      if (value) {
        parseFilter(value, filterType);
        isOk = true;
      }
    } catch (err) {
      isError = true;
    }
  }

  function applyFilter() {
    if ((filter || '') == (value || '')) return;
    setFilter(value);
  }

  // $: if (value != filter) setFilter(value);
</script>

<div class="flex">
  <input
    bind:this={domInput}
    type="text"
    autocomplete="off"
    readOnly={isReadOnly}
    bind:value
    on:keydown={handleKeyDown}
    on:blur={applyFilter}
    on:paste={handlePaste}
    class:isError
    class:isOk
  />
  <DropDownButton icon="icon filter" menu={createMenu} />
  {#if showResizeSplitter}
    <div class="horizontal-split-handle resizeHandleControl" use:splitterDrag={'clientX'} on:resizeSplitter />
  {/if}
</div>

<style>
  input {
    flex: 1;
    min-width: 10px;
  }

  input.isError {
    background-color: var(--theme-bg-red);
  }

  input.isOk {
    background-color: var(--theme-bg-green);
  }
</style>
