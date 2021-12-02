<script lang="ts" context="module">
  export function openJsonDocument(json, title = 'JSON') {
    openNewTab(
      {
        title,
        icon: 'img json',
        tabComponent: 'JsonTab',
      },
      { editor: json }
    );
  }
</script>

<script lang="ts">
  import _ from 'lodash';
  import ErrorInfo from '../elements/ErrorInfo.svelte';
  import JSONTree from '../jsontree/JSONTree.svelte';
  import useEditorData from '../query/useEditorData';
  import openNewTab from '../utility/openNewTab';

  export let selection;
  export let showWholeRow = false;
  export let tabid;

  let json = null;
  let error = null;

  useEditorData({
    tabid,
    onInitialData: value => {
      json = value;
    },
  });
</script>

<div class="outer">
  <div class="inner">
    <JSONTree value={json} expanded />
  </div>
</div>

<style>
  .outer {
    flex: 1;
    position: relative;
  }
  .inner {
    overflow: scroll;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }
</style>
