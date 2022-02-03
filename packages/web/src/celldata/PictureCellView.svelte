<script lang="ts">
  import _ from 'lodash';
  import ErrorInfo from '../elements/ErrorInfo.svelte';

  export let selection;

  function extractPicture(values) {
    try {
      const value = values;
      if (value?.type == 'Buffer' && _.isArray(value?.data)) {
        return 'data:image/png;base64, ' + btoa(String.fromCharCode.apply(null, value?.data));
      }
      return null;
    } catch (err) {
      console.log('Error showing picture', err);
      return null;
    }
  }

  $: picture = extractPicture(selection[0]?.value);
</script>

{#if picture}
  <div class="wrapper">
    <img src={picture} />
  </div>
{:else}
  <ErrorInfo message="Error showing picture" alignTop />
{/if}

<style>
  .wrapper {
    overflow: auto;
    /* position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0; */
  }
</style>
