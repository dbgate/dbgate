<script lang="ts">
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';

  export let icon;
  export let label;
  export let values;
  export let field;
  export let count;
</script>

{#if count > 0}
  <InlineButton
    on:click={() => {
      $values = { ...$values, [field]: !$values[field] };
    }}
  >
    <FontIcon {icon} />
    <span class="switch">{label} ({count})</span>
    <FontIcon icon={$values && !$values[field] ? 'icon checkbox-marked' : 'icon checkbox-blank'} />
  </InlineButton>
{/if}

<style>
  .switch {
    margin-left: 5px;
  }
</style>
