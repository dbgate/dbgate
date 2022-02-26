<script lang="ts">
  export let type;
  export let label;
  export let noMargin = false;
  export let disabled = false;
  export let labelProps: any = {};
</script>

<div class="largeFormMarker" class:noMargin>
  {#if type == 'checkbox'}
    <slot />
    <span {...labelProps} on:click={labelProps.onClick} class:disabled class='checkLabel'>{label}</span>
  {:else}
    <div class="label" {...labelProps} on:click={labelProps.onClick}>
      <span {...labelProps} on:click={labelProps.onClick} class:disabled>{label}</span>
    </div>
    <slot />
  {/if}
</div>

<style>
  .label {
    margin-bottom: 3px;
    color: var(--theme-font-3);
  }
  .checkLabel {
    cursor: default;
    user-select: none;
  }
  .largeFormMarker:not(.noMargin) {
    margin: var(--dim-large-form-margin);
  }
  .disabled {
    color: var(--theme-font-3);
  }
</style>
