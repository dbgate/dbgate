<script lang="ts">
  import _ from 'lodash';

  export let selection;
  export let wrap;
</script>

<textarea
  class="flex1"
  {wrap}
  readonly
  value={selection
    .map(cell => {
      const { value } = cell;
      if (_.isPlainObject(value) || _.isArray(value)) return JSON.stringify(value, undefined, 2);
      return cell.value;
    })
    .join('\n')}
/>
