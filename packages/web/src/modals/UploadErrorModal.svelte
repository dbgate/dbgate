<script lang="ts">
  import { onMount } from 'svelte';
  import FormStyledButton from '../buttons/FormStyledButton.svelte';

  import FormProvider from '../forms/FormProvider.svelte';
  import FormSubmit from '../forms/FormSubmit.svelte';
  import FormTextField from '../forms/FormTextField.svelte';
  import { apiCall } from '../utility/api';
  import ModalBase from './ModalBase.svelte';
  import { closeCurrentModal } from './modalTools';
  import { copyTextToClipboard } from '../utility/clipboard';
  import Link from '../elements/Link.svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import { showSnackbarSuccess } from '../utility/snackbar';
  import ErrorInfo from '../elements/ErrorInfo.svelte';

  export let error = null;
  let htmlUrl;
  let url;
  let errorMessage;

  async function upload() {
    const resp = await apiCall('uploads/upload-error-to-gist');
    url = resp.url;
    htmlUrl = resp.html_url;
    errorMessage = resp.errorMessage;
  }

  onMount(() => {
    upload();
  });

  async function handleDelete() {
    const resp = await apiCall('uploads/delete-gist', { url });
    closeCurrentModal();
    showSnackbarSuccess('Gist was deleted');
  }

  function handleCopy() {
    copyTextToClipboard(htmlUrl);
  }
</script>

<ModalBase {...$$restProps}>
  <svelte:fragment slot="header">Upload error</svelte:fragment>

  {#if htmlUrl}
    <div>
      <p>
        Upload error to gist was successful. Please copy gist URL abnd paste it to related github issue. You could check
        uploaded data, if don't want to make them public, use Delete button to remove them from gist.
      </p>
      <p><Link href={htmlUrl}>Open uploaded data</Link></p>
    </div>
  {:else if errorMessage}
    <ErrorInfo message={errorMessage} />
  {:else}
    <LoadingInfo message="Uploading error to gist..." />
  {/if}

  <svelte:fragment slot="footer">
    <FormStyledButton value="Copy URL" disabled={!htmlUrl} on:click={handleCopy} />
    <FormStyledButton type="button" value="Close" on:click={closeCurrentModal} />
    <FormStyledButton value="Delete" disabled={!url} on:click={handleDelete} />
  </svelte:fragment>
</ModalBase>
