<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import ColumnMapColumnDropdown from '../elements/ColumnMapColumnDropdown.svelte';
  import Link from '../elements/Link.svelte';
  import TableControl from '../elements/TableControl.svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import _ from 'lodash';

  export let header = 'Configure columns';
  export let onConfirm;

  export let sourceTableInfo;
  export let targetTableInfo;

  export let initialValue;

  function getResetValue() {
    if (sourceTableInfo && !targetTableInfo) {
      return sourceTableInfo.columns.map(x => ({
        src: x.columnName,
        dst: x.columnName,
        skip: false,
      }));
    }
    if (targetTableInfo && !sourceTableInfo) {
      return targetTableInfo.columns.map(x => ({
        src: x.columnName,
        dst: x.columnName,
        skip: false,
      }));
    }
    if (sourceTableInfo && targetTableInfo) {
      return sourceTableInfo.columns
        .map(x => ({
          src: x.columnName,
          dst: targetTableInfo.columns.find(y => y.columnName == x.columnName)?.columnName,
          skip: false,
        }))
        .filter(x => x.dst != null);
    }
    return [];
  }

  const resetValue = getResetValue();

  function equalValues(v1, v2) {
    if (!v1 || !v2) return false;
    if (v1.length != v2.length) return false;
    for (let i = 0; i < v1.length; i++) {
      if (v1[i].src != v2[i].src || v1[i].dst != v2[i].dst || !!v1[i].skip != !!v2[i].skip) return false;
    }
    return true;
  }

  $: differentFromReset = !equalValues(value, resetValue);

  let value = initialValue?.length > 0 ? initialValue : resetValue;

  let validationError;

  function validate() {
    validationError = null;
    if (!value) return;
    if (value.length == 0) return;
    if (value.some(x => !x.src || !x.dst)) {
      validationError = 'Source and target columns must be defined';
      return;
    }
    const duplicates = _.chain(value.map(x => x.dst))
      .countBy()
      .pickBy(count => count > 1)
      .keys()
      .value();
    if (duplicates.length > 0) {
      validationError = 'Target columns must be unique, duplicates found: ' + duplicates.join(', ');
      return;
    }
  }

  $: {
    value;
    validate();
  }
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">{header}</div>

    {#if resetValue.length == 0}
      <div class="m-3">
        When no columns are defined in this mapping, source row is copied to target without any modifications
      </div>
    {/if}

    <TableControl
      columns={[
        { fieldName: 'use', header: 'Use', slot: 4 },
        { fieldName: 'src', header: 'Source column', slot: 1 },
        { fieldName: 'dst', header: 'Target column', slot: 2 },
        { fieldName: 'actions', header: '', slot: 3 },
      ]}
      rows={value || []}
      emptyMessage="No transform defined"
    >
      <svelte:fragment slot="4" let:row let:index>
        <CheckboxField
          checked={!row['skip']}
          on:change={e =>
            (value = (value || []).map((x, i) => (i == index ? { ...x, skip: !e.target.checked, ignore: false } : x)))}
        />
      </svelte:fragment>
      <svelte:fragment slot="1" let:row let:index>
        <ColumnMapColumnDropdown
          value={row['src']}
          onChange={column =>
            (value = (value || []).map((x, i) => (i == index ? { ...x, src: column, ignore: false } : x)))}
          tableInfo={sourceTableInfo}
        />
      </svelte:fragment>
      <svelte:fragment slot="2" let:row let:index>
        <ColumnMapColumnDropdown
          value={row['dst']}
          onChange={column =>
            (value = (value || []).map((x, i) => (i == index ? { ...x, dst: column, ignore: false } : x)))}
          tableInfo={targetTableInfo}
        />
      </svelte:fragment>
      <svelte:fragment slot="3" let:index>
        <Link
          onClick={() => {
            value = value.filter((x, i) => i != index);
          }}>Remove</Link
        >
      </svelte:fragment>
    </TableControl>

    {#if validationError}
      <div class="error-result">
        <FontIcon icon="img error" />
        {validationError}
      </div>
    {/if}

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
        disabled={!!validationError}
        on:click={() => {
          closeCurrentModal();
          onConfirm(!value || value.length == 0 || !differentFromReset ? null : value);
        }}
      />
      <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
      <FormStyledButton
        type="button"
        value="Add column"
        on:click={() => {
          value = [...(value || []), {}];
        }}
      />
      <FormStyledButton
        type="button"
        value="Reset"
        disabled={!differentFromReset}
        on:click={() => {
          value = resetValue;
        }}
      />
    </svelte:fragment>
  </ModalBase>
</FormProvider>

<style>
  .error-result {
    margin: 10px;
  }
</style>
