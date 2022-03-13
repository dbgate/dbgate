<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import Link from '../elements/Link.svelte';
  import TableControl from '../elements/TableControl.svelte';
  import CheckboxField from '../forms/CheckboxField.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import TextField from '../forms/TextField.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let header = 'Configure columns';
  export let onConfirm;
  export let value = [];
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <div slot="header">{header}</div>

    <div class="m-3">
      When no columns are defined in this mapping, source row is copied to target without any modifications
    </div>

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
          on:change={e => (value = (value || []).map((x, i) => (i == index ? { ...x, skip: !e.target.checked } : x)))}
        />
      </svelte:fragment>
      <svelte:fragment slot="1" let:row let:index>
        <TextField
          value={row['src']}
          on:change={e => (value = (value || []).map((x, i) => (i == index ? { ...x, src: e.target.value } : x)))}
        />
      </svelte:fragment>
      <svelte:fragment slot="2" let:row let:index>
        <TextField
          value={row['dst']}
          on:change={e => (value = (value || []).map((x, i) => (i == index ? { ...x, dst: e.target.value } : x)))}
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
          onConfirm(!value || value.length == 0 ? null : value);
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
        on:click={() => {
          value = [];
        }}
      />
    </svelte:fragment>
  </ModalBase>
</FormProvider>
