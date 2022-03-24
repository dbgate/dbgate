<script lang="ts">
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import DbKeyItemDetail from '../dbkeyvalue/DbKeyItemDetail.svelte';
  import FormFieldTemplateLarge from '../forms/FormFieldTemplateLarge.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import SelectField from '../forms/SelectField.svelte';
  import TextField from '../forms/TextField.svelte';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';

  export let conid;
  export let database;
  export let driver;
  export let onConfirm;

  let item = {};
  let keyName = '';
  let type = driver.supportedKeyTypes[0].name;

  const handleSubmit = async () => {
    closeCurrentModal();
    onConfirm({ type, keyName, ...item });
  };
</script>

<FormProvider>
  <ModalBase {...$$restProps}>
    <svelte:fragment slot="header">Add key</svelte:fragment>

    <div class="container">
      <FormFieldTemplateLarge label="Key" type="text" noMargin>
        <TextField
          value={keyName}
          on:change={e => {
            // @ts-ignore
            keyName = e.target.value;
          }}
        />
      </FormFieldTemplateLarge>

      <div class="m-3" />

      <FormFieldTemplateLarge label="Type" type="combo" noMargin>
        <SelectField
          options={driver.supportedKeyTypes.map(t => ({ value: t.name, label: t.label }))}
          value={type}
          isNative
          on:change={e => {
            type = e.detail;
          }}
        />
      </FormFieldTemplateLarge>

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
    flex-direction: column;
    height: 30vh;
  }
</style>
