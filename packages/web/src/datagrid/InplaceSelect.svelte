<script lang="ts">
  import { stringifyCellValue } from 'dbgate-tools';
  import { onMount } from 'svelte';
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
  });

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
  <div on:click={() => (isOptionsHidden = !isOptionsHidden)} class="value">
    {value}
  </div>

  {#if canSelectMultipleOptions}
    <div class="confirm">
      <ShowFormButton icon="icon ok" on:click={handleConfirm} />
    </div>
  {/if}

  <div class="options" class:hidden={isOptionsHidden}>
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
    position: absolute;
    z-index: 10;
    top: 100%;
    left: 0;
    width: 100%;
    list-style: none;
    margin: 0;
    padding: 0;
    background-color: var(--theme-bg-alt);
    max-height: 150px;
    overflow: auto;
    box-shadow: 0 1px 10px 1px var(--theme-bg-inv-3);
  }

  .value {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 20;
    min-height: 17px;
    background-color: var(--theme-bg-0);
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
    border-bottom: 1px solid var(--theme-border);
    display: block;
    min-height: 16px;
  }

  label:hover {
    background-color: var(--theme-bg-hover);
  }
</style>
