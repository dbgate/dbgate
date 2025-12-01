<script lang="ts">
  import FormStyledButtonLikeLabel from '../buttons/FormStyledButtonLikeLabel.svelte';
  import uploadFiles from '../utility/uploadFiles';
  import { _t } from '../translations';

  const handleChange = e => {
    const files = [...e.target.files];
    uploadFiles(files);
  };
</script>

<div class="m-1">
  <FormStyledButtonLikeLabel htmlFor="uploadFileButton">{_t('files.uploadFile', { defaultMessage: "Upload file" })}</FormStyledButtonLikeLabel>
  <input type="file" id="uploadFileButton" hidden on:change={handleChange} />
</div>
