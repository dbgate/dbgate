<script lang="ts">
  import VerticalSplitter from '../elements/VerticalSplitter.svelte';
  import SqlEditor from '../query/SqlEditor.svelte';
  import useEditorData from '../query/useEditorData';
  import { extensions } from '../stores';
  import applySqlTemplate from '../utility/applySqlTemplate';
  import { useConnectionInfo } from '../utility/metadataLoaders';

  export let tabid;
  export let conid;
  export let database;
  export let initialArgs;

  $: connection = useConnectionInfo({ conid });

  const { editorState, setEditorData } = useEditorData({
    tabid,
    loadFromArgs:
      initialArgs && initialArgs.sqlTemplate
        ? () => applySqlTemplate(initialArgs.sqlTemplate, $extensions, $$props)
        : null,
  });
</script>

<VerticalSplitter>
  <svelte:fragment slot="1">
    <SqlEditor
      engine={$connection && $connection.engine}
      value={$editorState.value || ''}
      on:input={e => setEditorData(e.detail)}
    />
  </svelte:fragment>
</VerticalSplitter>
