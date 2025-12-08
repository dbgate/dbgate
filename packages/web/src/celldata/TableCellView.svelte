<script lang="ts">
  import _ from 'lodash';
  import { tick } from 'svelte';
  import CellValue from '../datagrid/CellValue.svelte';
  import { isJsonLikeLongString, safeJsonParse, parseCellValue, stringifyCellValue } from 'dbgate-tools';
  import keycodes from '../utility/keycodes';
  import createRef from '../utility/createRef';
  import { showModal } from '../modals/modalTools';
  import EditCellDataModal from '../modals/EditCellDataModal.svelte';
  import ShowFormButton from '../formview/ShowFormButton.svelte';
  import { openJsonDocument } from '../tabs/JsonTab.svelte';

  export let selection;

  $: firstSelection = selection?.[0];
  $: rowData = firstSelection?.rowData;
  $: editable = firstSelection?.editable;
  $: editorTypes = firstSelection?.editorTypes;
  $: columns = selection?.columns || [];
  $: realColumnUniqueNames = selection?.realColumnUniqueNames || [];
  $: setCellValue = selection?.setCellValue;

  $: orderedFields = realColumnUniqueNames
    .map(colName => {
      const col = columns.find(c => c.uniqueName === colName);
      if (!col) return null;
      const value = rowData?.[colName];
      return {
        columnName: col.columnName || colName,
        uniqueName: colName,
        value,
        col,
      };
    })
    .filter(Boolean);

  let editingColumn = null;
  let editValue = '';
  let domEditor = null;
  const isChangedRef = createRef(false);

  function isJsonValue(value) {
    if (_.isPlainObject(value) && !(value?.type == 'Buffer' && _.isArray(value.data)) && !value.$oid && !value.$bigint) {
      return true;
    }
    if (_.isArray(value)) return true;
    if (typeof value !== 'string') return false;
    if (!isJsonLikeLongString(value)) return false;
    const parsed = safeJsonParse(value);
    return parsed !== null && (_.isPlainObject(parsed) || _.isArray(parsed));
  }

  function getJsonObject(value) {
    if (_.isPlainObject(value) || _.isArray(value)) return value;
    if (typeof value === 'string') return safeJsonParse(value);
    return null;
  }

  function handleDoubleClick(field) {
    if (!editable || !setCellValue) return;
    if (isJsonValue(field.value)) {
      openEditModal(field);
      return;
    }
    startEditing(field);
  }

  function startEditing(field) {
    if (!editable || !setCellValue) return;
    editingColumn = field.uniqueName;
    editValue = stringifyCellValue(field.value, 'inlineEditorIntent', editorTypes).value;
    isChangedRef.set(false);
    tick().then(() => {
      if (!domEditor) return;
      domEditor.focus();
      domEditor.select();
    });
  }

  function handleKeyDown(event, field) {
    switch (event.keyCode) {
      case keycodes.escape:
        isChangedRef.set(false);
        editingColumn = null;
        break;
      case keycodes.enter:
        if (isChangedRef.get()) {
          saveValue(field);
        }
        editingColumn = null;
        event.preventDefault();
        break;
      case keycodes.tab:
        if (isChangedRef.get()) {
          saveValue(field);
        }
        editingColumn = null;
        event.preventDefault();
        moveToNextField(field, event.shiftKey);
        break;
    }
  }

  function moveToNextField(field, reverse) {
    const currentIndex = orderedFields.findIndex(f => f.uniqueName === field.uniqueName);
    const nextIndex = reverse ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= orderedFields.length) return;
    
    tick().then(() => {
      const nextField = orderedFields[nextIndex];
      if (isJsonValue(nextField.value)) {
        openEditModal(nextField);
      } else {
        startEditing(nextField);
      }
    });
  }

  function handleBlur(field) {
    if (isChangedRef.get()) {
      saveValue(field);
    }
    editingColumn = null;
  }

  function saveValue(field) {
    if (!setCellValue) return;
    const parsedValue = parseCellValue(editValue, editorTypes);
    setCellValue(field.uniqueName, parsedValue);
    isChangedRef.set(false);
  }

  function openEditModal(field) {
    if (!setCellValue) return;
    showModal(EditCellDataModal, {
      value: field.value,
      dataEditorTypesBehaviour: editorTypes,
      onSave: value => setCellValue(field.uniqueName, value),
    });
  }

  function openJsonInNewTab(field) {
    const jsonObj = getJsonObject(field.value);
    if (jsonObj) openJsonDocument(jsonObj, undefined, true);
  }

  function getJsonParsedValue(value) {
    if (editorTypes?.explicitDataType) return null;
    if (!isJsonLikeLongString(value)) return null;
    return safeJsonParse(value);
  }
</script>

<div class="outer">
  <div class="inner">
    {#if !rowData}
      <div class="no-data">No data selected</div>
    {:else}
      {#each orderedFields as field (field.uniqueName)}
        <div class="field">
          <div class="field-name">{field.columnName}</div>
          <div 
            class="field-value"
            class:editable
            on:dblclick={() => handleDoubleClick(field)}
          >
            {#if editingColumn === field.uniqueName}
              <div class="editor-wrapper">
                <input
                  type="text"
                  bind:this={domEditor}
                  bind:value={editValue}
                  on:input={() => isChangedRef.set(true)}
                  on:keydown={e => handleKeyDown(e, field)}
                  on:blur={() => handleBlur(field)}
                  class="inline-editor"
                />
                {#if editable}
                  <ShowFormButton
                    icon="icon edit"
                    on:click={() => {
                      editingColumn = null;
                      openEditModal(field);
                    }}
                  />
                {/if}
              </div>
            {:else}
              <CellValue 
                {rowData} 
                value={field.value} 
                jsonParsedValue={getJsonParsedValue(field.value)}
                {editorTypes}
              />
              {#if isJsonValue(field.value)}
                <ShowFormButton 
                  icon="icon open-in-new" 
                  on:click={() => openJsonInNewTab(field)} 
                />
              {/if}
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .outer {
    flex: 1;
    position: relative;
  }

  .inner {
    overflow: auto;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    padding: 4px;
  }

  .no-data {
    color: var(--theme-font-3);
    font-style: italic;
    padding: 8px;
  }

  .field {
    margin-bottom: 8px;
    border: 1px solid var(--theme-border);
    border-radius: 3px;
    overflow: hidden;
  }

  .field-name {
    background: var(--theme-bg-1);
    padding: 4px 8px;
    font-weight: 500;
    font-size: 11px;
    color: var(--theme-font-2);
    border-bottom: 1px solid var(--theme-border);
  }

  .field-value {
    padding: 6px 8px;
    background: var(--theme-bg-0);
    min-height: 20px;
    word-break: break-all;
    position: relative;
  }

  .field-value.editable {
    cursor: text;
  }

  .field-value.editable:hover {
    background: var(--theme-bg-hover);
  }

  .editor-wrapper {
    display: flex;
    align-items: center;
  }

  .inline-editor {
    flex: 1;
    border: none;
    outline: none;
    background: var(--theme-bg-0);
    color: var(--theme-font-1);
    padding: 0;
    margin: 0;
    font-family: inherit;
    font-size: inherit;
  }

  .inline-editor:focus {
    outline: none;
  }
</style>
