<script lang="ts">
  import FormStyledButtonLikeLabel from '../buttons/FormStyledButtonLikeLabel.svelte';
  import uploadFiles from '../utility/uploadFiles';

  const handleChange = e => {
    const files = [...e.target.files];
    uploadFiles(files);
  };
</script>

<div class="m-1">
  <FormStyledButtonLikeLabel htmlFor="uploadFileButton">Upload file</FormStyledButtonLikeLabel>
  <input type="file" id="uploadFileButton" hidden on:change={handleChange} />
</div>
