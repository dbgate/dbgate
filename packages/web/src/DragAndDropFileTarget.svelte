<script lang="ts">
  import _ from 'lodash';
  import FontIcon from './icons/FontIcon.svelte';

  import { extensions, isFileDragActive } from './stores';

  import getElectron from './utility/getElectron';

  const electron = getElectron();
  $: fileTypeNames = _.compact([
    ...$extensions.fileFormats.filter(x => x.readerFunc).map(x => x.name),
    electron ? 'SQL' : null,
    electron ? 'SQLite database' : null,
  ]);
</script>

<div class="target">
  <div>
    <div class="icon">
      <FontIcon icon="icon cloud-upload" />
    </div>
    <div class="title">Drop the files to upload to DbGate</div>
    <div class="info">Supported file types: {fileTypeNames.join(', ')}</div>
    <div
      class="class-button"
      on:click={() => {
        $isFileDragActive = false;
      }}
    >
      <FontIcon icon="icon close" padRight />
      Close
    </div>
  </div>
</div>

<style>
  .target {
    position: fixed;
    display: flex;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--theme-bg-selected);
    align-items: center;
    justify-content: space-around;
    z-index: 1000;
  }
  .icon {
    display: flex;
    justify-content: space-around;
    font-size: 50px;
    margin-bottom: 20px;
  }
  .info {
    display: flex;
    justify-content: space-around;
    margin-top: 10px;
  }
  .title {
    font-size: 30px;
    display: flex;
    justify-content: space-around;
  }

  .class-button {
    position: fixed;
    top: 20px;
    right: 20px;
    font-size: 14pt;
    cursor: pointer;
  }
</style>
