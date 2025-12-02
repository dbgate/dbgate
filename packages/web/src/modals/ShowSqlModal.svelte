<script lang='ts'>
  import _ from 'lodash';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';
  import newQuery from '../query/newQuery';
  import SqlEditor from '../query/SqlEditor.svelte';

  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { _t } from '../translations';

  export let sql;
  export let onConfirm;
  export let engine = null;
</script>

<ModalBase {...$$restProps}>
  <div slot="header">{_t('script.sqlScript', { defaultMessage: 'SQL Script' })}</div>

  <div class="editor">
    <SqlEditor {engine} value={sql} readOnly />
  </div>

  <div slot="footer">
    <FormStyledButton
      type="button"
      value={_t('common.close', { defaultMessage: 'Close' })}
      on:click={closeCurrentModal}
      data-testid="ShowSqlModal_closeButton"
    />
    <FormStyledButton
      type="button"
      value={_t('common.openScript', { defaultMessage: "Open script" })}
      on:click={() => {
        newQuery({
          initialData: sql,
        });

        closeCurrentModal();
      }}
      data-testid="ShowSqlModal_openScriptButton"
    />
  </div>
</ModalBase>

<style>
  .editor {
    position: relative;
    height: 30vh;
    width: 40vw;
  }

  .form-margin {
    margin: var(--dim-large-form-margin);
  }

  .flex-wrap {
    flex-wrap: wrap;
  }
</style>
