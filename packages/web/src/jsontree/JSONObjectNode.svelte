<script>
  import JSONNested from './JSONNested.svelte';

  export let key, value, isParentExpanded, isParentArray, nodeType;
  export let expanded = false;
  export let labelOverride = null;
  export let onRootExpandedChanged = null;

  $: keys = Object.getOwnPropertyNames(value);

  function getValue(key) {
    return value[key];
  }
</script>

<JSONNested
  {key}
  {expanded}
  {isParentExpanded}
  {isParentArray}
  {keys}
  previewKeys={keys}
  {getValue}
  label={labelOverride || `${nodeType} `}
  bracketOpen={'{'}
  bracketClose={'}'}
  elementValue={value}
  {onRootExpandedChanged}
/>
