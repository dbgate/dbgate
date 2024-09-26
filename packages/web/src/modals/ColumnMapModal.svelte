<script lang="ts">
  import DropDownButton from '../buttons/DropDownButton.svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import ColumnMapColumnDropdown from '../elements/ColumnMapColumnDropdown.svelte';
  import Link from '../elements/Link.svelte';
  import TableControl from '../elements/TableControl.svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

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
          onChange={e =>
            (value = (value || []).map((x, i) => (i == index ? { ...x, dst: e.target.value, ignore: false } : x)))}
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

    <svelte:fragment slot="footer">
      <FormSubmit
        value="OK"
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
