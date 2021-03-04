<script lang="ts">
  import _ from 'lodash';

  export let options = [];
  export let value;
</script>

<select {...$$restProps} on:change>
  {#each _.compact(options) as x (x.value)}
    <option value={x.value} selected={value == x.value}>
      {x.label}
    </option>
  {/each}
</select>
