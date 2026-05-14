<script lang="ts">
  import { stringifyCellValue } from 'dbgate-tools';
  import { onMount, tick } from 'svelte';
  import ShowFormButton from '../formview/ShowFormButton.svelte';
  import clickOutside from '../utility/clickOutside';
  import keycodes from '../utility/keycodes';

  export let inplaceEditorState;
  export let dispatchInsplaceEditor;
  export let onSetValue;
  export let cellValue;
  export let options;
  export let canSelectMultipleOptions;
  export let driver;

  export let dataEditorTypesBehaviourOverride = null;

  let value;
  let valueInit;
  let optionsData;
  let isOptionsHidden = false;
  let valueEl;
  let dropdownStyle = '';

  onMount(() => {
    value =
      inplaceEditorState.text ||
      stringifyCellValue(
        cellValue,
        'inlineEditorIntent',
        dataEditorTypesBehaviourOverride ?? driver?.dataEditorTypesBehaviour
      ).value;
    valueInit = value;

    const optionsSelected = value.split(',');
    optionsData = options.map(function (option) {
      return {
        value: option,
        isSelected: optionsSelected.includes(option),
      };
    });

    tick().then(positionDropdown);
  });

  function positionDropdown() {
    if (!valueEl) return;
    const rect = valueEl.getBoundingClientRect();
    const maxH = 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let styleStr;
    if (spaceBelow >= Math.min(maxH, 80) || spaceBelow >= spaceAbove) {
      const height = Math.max(Math.min(maxH, spaceBelow - 4), 50);
      styleStr = `left:${rect.left}px; top:${rect.bottom}px; width:${rect.width}px; max-height:${height}px;`;
    } else {
      const height = Math.max(Math.min(maxH, spaceAbove - 4), 50);
      styleStr = `left:${rect.left}px; bottom:${window.innerHeight - rect.top}px; width:${rect.width}px; max-height:${height}px;`;
    }
    dropdownStyle = styleStr;
  }

  function handleCheckboxChanged(e, option) {
    if (!canSelectMultipleOptions) {
      optionsData.forEach(option => (option.isSelected = false));
      option.isSelected = true;
    } else {
      option.isSelected = e.target.checked;
    }

    value = optionsData
      .filter(option => option.isSelected)
      .map(option => option.value)
      .join(',');

    if (!canSelectMultipleOptions) handleConfirm();
  }

  function handleConfirm() {
    if (value !== valueInit) {
      onSetValue(value);
      dispatchInsplaceEditor({ type: 'close', mode: 'save' });
    } else {
      dispatchInsplaceEditor({ type: 'close' });
    }
  }

  function handleKeyDown(e) {
    if (e.keyCode == keycodes.enter) {
      handleConfirm();
    }
  }

  function handleClickOutside() {
    isOptionsHidden = true;
    handleConfirm();
  }
</script>

<div use:clickOutside on:clickOutside={handleClickOutside} on:keydown={handleKeyDown} class="inplaceselect">
  <div on:click={() => (isOptionsHidden = !isOptionsHidden)} class="value" bind:this={valueEl}>
    {value}
  </div>

  {#if canSelectMultipleOptions}
    <div class="confirm">
      <ShowFormButton icon="icon ok" on:click={handleConfirm} />
    </div>
  {/if}

  <div class="options" class:hidden={isOptionsHidden} style={dropdownStyle}>
    {#each optionsData ?? [] as option}
      <label>
        <input
          type="checkbox"
          on:change={e => handleCheckboxChanged(e, option)}
          bind:checked={option.isSelected}
          class:hidden={!canSelectMultipleOptions}
        />
        {option.value}
      </label>
    {/each}
  </div>
</div>

<style>
  .options {
    position: fixed;
    z-index: 1000;
    list-style: none;
    margin: 0;
    padding: 0;
    background-color: var(--theme-toolstrip-button-background);
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow: var(--theme-input-inplace-select-shadow);
  }

  .value {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 20;
    min-height: 17px;
    background-color: var(--theme-toolstrip-button-background);
    height: 100%;
    width: calc(100% - 4px);
    padding: 0 2px;
    display: flex;
    align-items: center;
    overflow-x: hidden;
  }

  .confirm {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 30;
  }

  .hidden {
    display: none;
  }

  label {
    padding: 2px 3px;
    border-bottom: var(--theme-toolstrip-button-border);
    display: block;
    min-height: 16px;
  }

  label:hover {
    background-color: var(--theme-toolstrip-button-background-hover);
  }
</style>
