<script lang="ts">
  import _ from 'lodash';
  import { tick } from 'svelte';
  import CellValue from '../datagrid/CellValue.svelte';
  import { isJsonLikeLongString, safeJsonParse, parseCellValue, stringifyCellValue, filterName } from 'dbgate-tools';
  import keycodes from '../utility/keycodes';
  import createRef from '../utility/createRef';
  import { showModal } from '../modals/modalTools';
  import EditCellDataModal from '../modals/EditCellDataModal.svelte';
  import SearchBoxWrapper from '../elements/SearchBoxWrapper.svelte';
  import SearchInput from '../elements/SearchInput.svelte';
  import CloseSearchButton from '../buttons/CloseSearchButton.svelte';
  import { _t } from '../translations';
  import ColumnLabel from '../elements/ColumnLabel.svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';
  import { getLocalStorage, setLocalStorage } from '../utility/storageCache';
  import JSONTree from '../jsontree/JSONTree.svelte';
  import Link from '../elements/Link.svelte';

  export let selection;

  $: firstSelection = selection?.[0];
  $: rowData = firstSelection?.rowData;
  $: editable = firstSelection?.editable;
  $: editorTypes = firstSelection?.editorTypes;
  $: displayColumns = firstSelection?.displayColumns || [];
  $: realColumnUniqueNames = firstSelection?.realColumnUniqueNames || [];
  $: grider = firstSelection?.grider;

  $: uniqueRows = _.uniqBy(selection || [], 'row');
  $: isMultipleRows = uniqueRows.length > 1;

  function areValuesEqual(val1, val2) {
    if (val1 === val2) return true;
    if (val1 == null && val2 == null) return true;
    if (val1 == null || val2 == null) return false;
    return _.isEqual(val1, val2);
  }

  function getFieldValue(colName) {
    if (!isMultipleRows) return { value: rowData?.[colName], hasMultipleValues: false };

    const values = uniqueRows.map(sel => sel.rowData?.[colName]);
    const firstValue = values[0];
    const allSame = values.every(v => areValuesEqual(v, firstValue));

    return allSame ? { value: firstValue, hasMultipleValues: false } : { value: null, hasMultipleValues: true };
  }

  let filter = '';
  let notNull = getLocalStorage('dataGridCellDataFormNotNull') === 'true';

  $: orderedFields = realColumnUniqueNames
    .map(colName => {
      const col = displayColumns.find(c => c.uniqueName === colName);
      if (!col) return null;
      const { value, hasMultipleValues } = getFieldValue(colName);
      return {
        ...col,
        value,
        hasMultipleValues,
        // columnName: col.columnName || colName,
        // uniqueName: colName,
        // value,
        // hasMultipleValues,
        // col,
      };
    })
    .filter(Boolean);

  $: filteredFields = orderedFields
    .filter(field => filterName(filter, field.columnName))
    .filter(field => {
      if (notNull) {
        return field.value != null || field.hasMultipleValues;
      }
      return true;
    });

  let editingColumn = null;
  let editValue = '';
  let domEditor = null;
  const isChangedRef = createRef(false);

  function isJsonValue(value) {
    if (
      _.isPlainObject(value) &&
      !(value?.type == 'Buffer' && _.isArray(value.data)) &&
      !value.$oid &&
      !value.$bigint &&
      !value.$decimal
    ) {
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

  function handleClick(field) {
    if (!editable || !grider) return;
    if (isJsonValue(field.value)) return;
    // if (isJsonValue(field.value) && !field.hasMultipleValues) {
    //   openEditModal(field);
    //   return;
    // }
    startEditing(field);
  }

  function handleDoubleClick(field) {
    if (!editable || !grider) return;
    if (isJsonValue(field.value) && !field.hasMultipleValues) {
      openEditModal(field);
      return;
    }
    startEditing(field);
  }

  function startEditing(field) {
    if (!editable || !grider) return;
    editingColumn = field.uniqueName;
    editValue = field.hasMultipleValues ? '' : stringifyCellValue(field.value, 'inlineEditorIntent', editorTypes).value;
    isChangedRef.set(false);
    tick().then(() => {
      if (!domEditor) return;
      domEditor.focus();
      if (!field.hasMultipleValues) domEditor.select();
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
      case keycodes.upArrow:
      case keycodes.downArrow:
        const reverse = event.keyCode === keycodes.upArrow || (event.keyCode === keycodes.tab && event.shiftKey);
        event.preventDefault();
        moveToNextField(field, reverse);
        break;
    }
  }

  function moveToNextField(field, reverse) {
    const currentIndex = filteredFields.findIndex(f => f.uniqueName === field.uniqueName);
    const nextIndex = reverse ? currentIndex - 1 : currentIndex + 1;
    const nextField = filteredFields[nextIndex];
    if (!nextField) return;

    if (isChangedRef.get()) {
      saveValue(field);
    }
    editingColumn = null;
    if (nextIndex < 0 || nextIndex >= filteredFields.length) return;

    tick().then(() => {
      startEditing(nextField);
      // if (isJsonValue(nextField.value)) {
      //   openEditModal(nextField);
      // } else {
      //   startEditing(nextField);
      // }
    });
  }

  function handleSearchKeyDown(e) {
    if (e.keyCode === keycodes.backspace && (e.metaKey || e.ctrlKey)) {
      filter = '';
      e.stopPropagation();
      e.preventDefault();
    }
  }

  function handleBlur(field) {
    if (isChangedRef.get()) {
      saveValue(field);
    }
    editingColumn = null;
  }

  function setCellValue(fieldName, value) {
    if (!grider) return;

    if (selection.length > 0) {
      const uniqueRowIndices = _.uniq(selection.map(x => x.row));
      grider.beginUpdate();
      for (const row of uniqueRowIndices) {
        grider.setCellValue(row, fieldName, value);
      }
      grider.endUpdate();
    }
  }

  function saveValue(field) {
    if (!grider) return;
    const parsedValue = parseCellValue(editValue, editorTypes);
    setCellValue(field.uniqueName, parsedValue);
    isChangedRef.set(false);
  }

  function openEditModal(field) {
    if (!grider) return;
    showModal(EditCellDataModal, {
      value: field.value,
      dataEditorTypesBehaviour: editorTypes,
      onSave: value => setCellValue(field.uniqueName, value),
    });
  }

  function getJsonParsedValue(value) {
    if (editorTypes?.explicitDataType) return null;
    if (!isJsonLikeLongString(value)) return null;
    return safeJsonParse(value);
  }

  function handleEdit(field) {
    editingColumn = null;
    openEditModal(field);
  }
</script>

<div class="outer">
  <div class="content">
    {#if rowData}
      <div class="search-wrapper" on:keydown={handleSearchKeyDown}>
        <SearchBoxWrapper noMargin {filter}>
          <SearchInput
            placeholder={_t('tableCell.filterColumns', { defaultMessage: 'Filter columns' })}
            bind:value={filter}
          />
          <CloseSearchButton bind:filter />
        </SearchBoxWrapper>
        <CheckboxField
          defaultChecked={notNull}
          on:change={e => {
            // @ts-ignore
            notNull = e.target.checked;
            setLocalStorage('dataGridCellDataFormNotNull', notNull ? 'true' : 'false');
          }}
        />
        {_t('tableCell.hideNullValues', { defaultMessage: 'Hide NULL values' })}
      </div>
    {/if}
    <div class="inner">
      {#if !rowData}
        <div class="no-data">{_t('tableCell.noDataSelected', { defaultMessage: 'No data selected' })}</div>
      {:else}
        {#each filteredFields as field (field.uniqueName)}
          <div class="field">
            <div class="field-name">
              <ColumnLabel {...field} showDataType /><Link onClick={() => handleEdit(field)}
                >{_t('tableCell.edit', { defaultMessage: 'Edit' })}
              </Link>
            </div>
            <div class="field-value" class:editable on:click={() => handleClick(field)}>
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
                </div>
              {:else if field.hasMultipleValues}
                <span class="multiple-values"
                  >({_t('tableCell.multipleValues', { defaultMessage: 'Multiple values' })})</span
                >
              {:else if isJsonValue(field.value)}
                <JSONTree value={getJsonParsedValue(field.value)} />
              {:else}
                <CellValue
                  {rowData}
                  value={field.value}
                  jsonParsedValue={getJsonParsedValue(field.value)}
                  {editorTypes}
                />
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .outer {
    flex: 1;
    position: relative;
  }

  .content {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
  }

  .search-wrapper {
    padding: 4px 4px 0 4px;
    flex-shrink: 0;
    border: var(--theme-table-border);
    border-bottom: none;
  }

  .inner {
    overflow: auto;
    flex: 1;
    padding: 4px;
  }

  .no-data {
    color: var(--theme-generic-font-grayed);
    font-style: italic;
    padding: 8px;
  }

  .field {
    margin-bottom: 8px;
    border: var(--theme-table-border);
    border-radius: 3px;
    overflow: hidden;
  }

  .field-name {
    background: var(--theme-table-header-background);
    padding: 4px 8px;
    font-weight: 500;
    font-size: 11px;
    color: var(--theme-generic-font-grayed);
    border-bottom: var(--theme-table-border);
    display: flex;
    justify-content: space-between;
  }

  .field-value {
    padding: 6px 8px;
    background: var(--theme-table-cell-background);
    min-height: 20px;
    word-break: break-all;
    position: relative;
  }

  .field-value.editable {
    cursor: text;
  }

  .editor-wrapper {
    display: flex;
    align-items: center;
  }

  .inline-editor {
    flex: 1;
    border: none;
    outline: none;
    background: var(--theme-table-cell-background);
    color: var(--theme-generic-font);
    padding: 0;
    margin: 0;
    font-family: inherit;
    font-size: inherit;
  }

  .inline-editor:focus {
    outline: none;
  }

  .multiple-values {
    color: var(--theme-generic-font-grayed);
    font-style: italic;
  }
</style>
