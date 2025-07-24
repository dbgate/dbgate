<script context="module" lang="ts">
  export type ProcessedFile = {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    content: string | ArrayBuffer | null;
    file: File;
  };
</script>

<script lang="ts">
  export let disabled: boolean = false;
  export let label: string = 'Choose File';
  export let onChange: ((fileData: ProcessedFile | ProcessedFile[]) => void) | null = null;
  export let accept: string = '*';
  export let multiple: boolean = false;

  let fileInput: HTMLInputElement;

  function handleFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length < 0 || !onChange) return;

    if (multiple) {
      const processedFiles = Array.from(files).map(processFile);
      Promise.all(processedFiles).then((results: ProcessedFile[]) => {
        onChange(results);
      });
    } else {
      processFile(files[0]).then((result: ProcessedFile) => {
        onChange(result);
      });
    }
  }

  function processFile(file: File): Promise<ProcessedFile> {
    return new Promise(resolve => {
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          content: e.target?.result || null,
          file: file,
        });
      };

      reader.readAsDataURL(file);
    });
  }

  function triggerFileInput(): void {
    fileInput.click();
  }
</script>

<input
  {disabled}
  bind:this={fileInput}
  type="file"
  {accept}
  {multiple}
  on:change={handleFileChange}
  style="display: none;"
/>

<button {disabled} on:click={triggerFileInput} class="file-input-btn">
  {label}
</button>

<style>
  .file-input-btn {
    border: 1px solid var(--theme-bg-button-inv-2);
    padding: 5px;
    margin: 2px;
    background-color: var(--theme-bg-button-inv);
    color: var(--theme-font-inv-1);
    border-radius: 2px;
    cursor: pointer;
  }

  .file-input-btn:hover:not(:disabled) {
    background-color: var(--theme-bg-button-inv-2);
  }

  .file-input-btn:active:not(:disabled) {
    background-color: var(--theme-bg-button-inv-3);
  }

  .file-input-btn:focus {
    outline: 2px solid var(--theme-bg-button-inv-2);
    outline-offset: 2px;
  }

  .file-input-btn:disabled {
    background-color: var(--theme-bg-button-inv-3);
    color: var(--theme-font-inv-3);
    cursor: not-allowed;
  }
</style>
