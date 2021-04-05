<script>
  import JSONNested from './JSONNested.svelte';
  import MapEntry from './utils/MapEntry'

  export let key, value, isParentExpanded, isParentArray, nodeType;

  let keys = [];

  $: {
    let result = [];
    let i = 0;
    for(const entry of value) {
      result.push([i++, new MapEntry(entry[0], entry[1])]);
    }
    keys = result;
  }
  function getKey(entry) {
    return entry[0];
  }
  function getValue(entry) {
    return entry[1];
  }
</script>
<JSONNested
  {key}
  {isParentExpanded}
  {isParentArray}
  {keys}
  {getKey}
  {getValue}
  label="{nodeType}({keys.length})"
  colon=""
  bracketOpen={'{'}
  bracketClose={'}'}
/>
