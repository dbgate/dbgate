<script lang="ts" context="module">
</script>

<script lang="ts">
import { createMultiLineFilter } from 'dbgate-filterparser';

  import FilterMultipleValuesModal from '../modals/FilterMultipleValuesModal.svelte';

  import { showModal } from '../modals/modalTools';
  import SetFilterModal from '../modals/SetFilterModal.svelte';
  import keycodes from '../utility/keycodes';

  import DropDownButton from '../widgets/DropDownButton.svelte';

  export let isReadOnly = false;
  export let filterType;
  export let filter;
  export let setFilter;

  let value;

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
      setFilter(value);
    }
    if (ev.keyCode == keycodes.escape) {
      setFilter('');
    }
    // if (ev.keyCode == keycodes.downArrow) {
    //   if (onFocusGrid) onFocusGrid();
    //   // ev.stopPropagation();
    //   ev.preventDefault();
    // }
    // if (ev.keyCode == KeyCodes.DownArrow || ev.keyCode == KeyCodes.UpArrow) {
    //     if (this.props.onControlKey) this.props.onControlKey(ev.keyCode);
    // }
  };

  $: value = filter;
  // $: if (value != filter) setFilter(value);
</script>

<div class="flex">
  <input type="text" readOnly={isReadOnly} bind:value on:keydown={handleKeyDown} />
  <DropDownButton icon="icon filter" menu={createMenu} />
</div>

<style>
  input {
    flex: 1;
    min-width: 10px;
  }
</style>
