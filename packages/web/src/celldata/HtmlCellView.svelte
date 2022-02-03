<script lang="ts">
  import _ from 'lodash';

  export let selection;
</script>

{@html selection
  .map(cell => {
    const { value } = cell;
    if (_.isPlainObject(value) || _.isArray(value)) return JSON.stringify(value, undefined, 2);
    return cell.value;
  })
  .join('\n')}
