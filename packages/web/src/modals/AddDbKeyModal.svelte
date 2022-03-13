<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import DbKeyItemDetail from '../dbkeyvalue/DbKeyItemDetail.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let conid;
  export let database;
  export let driver;
  export let onConfirm;

  let item = {};
  let type = driver.supportedKeyTypes[0].name;

  const handleSubmit = async () => {
    closeCurrentModal();
    onConfirm(item);
  };
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Add item</svelte:fragment>

    <div class="container">
      <SelectField
        options={driver.supportedKeyTypes.map(t => ({ value: t.name, label: t.label }))}
        value={type}
        on:change={e => {
          type = e.detail;
        }}
      />

      <DbKeyItemDetail
      dbKeyFields={driver.supportedKeyTypes.find(x => x.name == type).dbKeyFields}
        {item}
        onChangeItem={value => {
          item = value;
        }}
      />
    </div>

    <svelte:fragment slot="footer">
      <FormStyledButton value="OK" on:click={e => handleSubmit()} />
      <FormStyledButton type="button" value="Cancel" on:click={closeCurrentModal} />
    </svelte:fragment>
  </ModalBase>
</FormProvider>

<style>
  .container {
    display: flex;
    height: 30vh;
  }
</style>
