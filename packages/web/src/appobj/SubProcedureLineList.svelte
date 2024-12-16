<script lang="ts" context="module">
  export const extractKey = ({ lineData }) => lineData;
</script>

<script lang="ts">
  import AppObjectList from './AppObjectList.svelte';
  import * as procedureLineAppObject from './ProcedureLineAppObject.svelte';

  export let data;
  export let filter;
  export let isExpandedOnlyBySearch;
</script>

<AppObjectList
  list={(data.createSql?.split('\n') || []).map(lineData => ({
    lineData,
  }))}
  module={procedureLineAppObject}
  {filter}
  {isExpandedOnlyBySearch}
/>
