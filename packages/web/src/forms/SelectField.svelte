<script lang="ts">
  export let options = [];
  export let value;

  $: console.log('FIELD', $$props.value);
</script>

<select {...$$restProps} on:change>
  {#each options as x (x.value)}
    <option value={x.value} selected={value == x.value}>
      {x.label}
    </option>
  {/each}
</select>
