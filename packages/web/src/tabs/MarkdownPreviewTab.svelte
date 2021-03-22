<script lang="ts">
  import { getContext } from 'svelte';
  import LoadingInfo from '../elements/LoadingInfo.svelte';
  import Markdown from '../elements/Markdown.svelte';

  import useEditorData from '../query/useEditorData';

  export let sourceTabId;
  const tabVisible: any = getContext('tabVisible');
  let data = null;

  const { initialLoad, editorState } = useEditorData({
    tabid: sourceTabId,
    onInitialData: value => {
      console.log('onInitialData', value);
      data = value;
    },
  });

  $: if ($tabVisible) initialLoad();
</script>

{#if $editorState.isLoading}
  <div>
    <LoadingInfo message="Loading markdown page" />
  </div>
{:else}
  <div>
    {#key data}
      <Markdown source={data || ''} />
    {/key}
  </div>
{/if}

<style>
  div {
    padding: 10px;
    overflow: auto;
    flex: 1;
  }
</style>
