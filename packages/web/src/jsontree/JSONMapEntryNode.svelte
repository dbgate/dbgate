<script>
  import JSONNested from './JSONNested.svelte';

  export let key, value, isParentExpanded, isParentArray;
  export let expanded = false;
  export let hideKey = false;
  export let labelOverride = null;

  const keys = ['key', 'value'];

  function getValue(key) {
    return value[key];
  }
</script>
<JSONNested
  {expanded}
  {isParentExpanded}
  {isParentArray}
  key={isParentExpanded ? String(key) : value.key}
  {keys}
  {getValue}
  label={labelOverride || (isParentExpanded ? 'Entry ' : '=> ')}
  bracketOpen={'{'}
  bracketClose={'}'}
  {labelOverride}
  {hideKey}
/>
