<script lang="ts">
  import _ from 'lodash';

  export let selection;
  export let wrap;

  $: singleSelection = selection?.length == 1 && selection?.[0];
  $: grider = singleSelection?.grider;
  $: editable = grider?.editable ?? false;

  function setCellValue(value) {
    if (!editable) return;
    grider.setCellValue(singleSelection.row, singleSelection.column, value);
  }
</script>

<textarea
  class="flex1"
  {wrap}
  readonly={!editable}
  value={selection
    .map(cell => {
      const { value } = cell;
      if (_.isPlainObject(value) || _.isArray(value)) return JSON.stringify(value, undefined, 2);
      return cell.value;
    })
    .join('\n')}
  on:input={e => setCellValue(e.target['value'])}
/>
