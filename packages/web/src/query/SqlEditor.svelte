<script lang="ts" context="module">
  const engineToMode = {
    mssql: 'sqlserver',
    mysql: 'mysql',
    postgres: 'pgsql',
  };
</script>

<script lang="ts">
  import AceEditor from './AceEditor.svelte';
  import * as ace from 'ace-builds/src-noconflict/ace';
  import useEffect from '../utility/useEffect';
  import { getContext } from 'svelte';
  import { mountCodeCompletion } from './codeCompletion';
  import { getCurrentSettings } from '../stores';
  import { useSettings } from '../utility/metadataLoaders';
  export let engine = null;
  export let conid = null;
  export let database = null;
  export let readOnly = false;

  let domEditor;

  let mode;

  const tabVisible: any = getContext('tabVisible');
  const settings = useSettings();

  $: {
    const match = (engine || '').match(/^([^@]*)@/);
    mode = engineToMode[match ? match[1] : engine] || 'sql';
  }

  $: enableWrap = $settings?.['sqlEditor.wordWrap'] || false;

  export function getEditor(): ace.Editor {
    return domEditor.getEditor();
  }

  export function getCurrentCommandText(): { text: string; line?: number } {
    return domEditor.getCurrentCommandText();
  }

  $: effect = useEffect(() => {
    const editor = domEditor?.getEditor();
    if ($tabVisible && conid && database && !readOnly && editor) {
      return mountCodeCompletion({
        conid,
        database,
        editor,
        getText: () => domEditor.getCodeCompletionCommandText(),
        getSettings: () => getCurrentSettings(),
      });
    }
    return () => {};
  });
  $: $effect;
</script>

<AceEditor
  {mode}
  {...$$props}
  on:input
  on:focus
  on:blur
  bind:this={domEditor}
  options={{
    ...$$props.options,
    wrap: enableWrap,
    enableBasicAutocompletion: true,
  }}
/>
