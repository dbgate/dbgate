<script lang="ts">
  import registerCommand from '../commands/registerCommand';
  import FormButton from '../forms/FormButton.svelte';
  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import TabControl from '../widgets/TabControl.svelte';
  import ConnectionModalDriverFields from './ConnectionModalDriverFields.svelte';
  import FormFieldTemplateLarge from './FormFieldTemplateLarge.svelte';

  import ModalBase from './ModalBase.svelte';

  export let connection;
</script>

<FormProvider
  template={FormFieldTemplateLarge}
  initialValues={connection || { server: 'localhost', engine: 'mssql@dbgate-plugin-mssql' }}
>
  <ModalBase {...$$restProps} noPadding>
    <div slot="header">Add connection</div>

    <TabControl
      isInline
      tabs={[
        {
          label: 'Main',
          component: ConnectionModalDriverFields,
        },
        {
          label: 'SSH Tunnel',
          slot: 1,
        },
      ]}
    >
      <div slot="1">SSH</div>
    </TabControl>

    <div slot="footer" class="flex">
      <div class="buttons">
        <FormButton value="Test" />
        <FormSubmit value="Save" on:click={v => console.log('SAVE', v.detail)} />
      </div>
    </div>
  </ModalBase>
</FormProvider>

<style>
  .buttons {
    flex-shrink: 0;
  }
</style>
