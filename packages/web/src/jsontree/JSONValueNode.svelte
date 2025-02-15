<script>
  import { getContext } from 'svelte';

  import JSONKey from './JSONKey.svelte';

  export let key, value, valueGetter = null, isParentExpanded, isParentArray, nodeType;

  const { colon } = getContext('json-tree-context-key');
</script>
<style>
  li {
    user-select: text;
    word-wrap: break-word;
    word-break: break-all;
  }
  .indent {
    padding-left: var(--li-identation);
  }
  .String {
    color: var(--string-color);
  }
  .ObjectId {
    color: var(--number-color);
  }
  .Date {
    color: var(--date-color);
  }
  .Number {
    color: var(--number-color);
  }
  .Boolean {
    color: var(--boolean-color);
  }
  .Null {
    color: var(--null-color);
  }
  .Undefined {
    color: var(--undefined-color);
  }
  .Function {
    color: var(--function-color);
    font-style: italic;
  }
  .Symbol {
    color: var(--symbol-color);
  }
</style>
<li class:indent={isParentExpanded}>
  <JSONKey {key} {colon} {isParentExpanded} {isParentArray} />
  <span class={nodeType}>
    {valueGetter ? valueGetter(value) : value}
  </span>
</li>