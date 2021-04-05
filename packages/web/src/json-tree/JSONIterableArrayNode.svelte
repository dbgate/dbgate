<script>
  import JSONNested from './JSONNested.svelte';

  export let key, value, isParentExpanded, isParentArray, nodeType;

  let keys = [];

  $: {
    let result = [];
    let i = 0;
    for(const entry of value) {
      result.push([i++, entry]);
    }
    keys = result;
  }

  function getKey(key) {
    return String(key[0]);
  }
  function getValue(key) {
    return key[1];
  }
</script>
<JSONNested
  {key}
  {isParentExpanded}
  {isParentArray}
  {keys}
  {getKey}
  {getValue}
  isArray={true}
  label="{nodeType}({keys.length})"
  bracketOpen={'{'}
  bracketClose={'}'}
/>