<script lang="ts">
  export let type;
  export let label;
  export let noMargin;
  export let disabled = false;
  export let labelProps: any = {};
</script>

<div class="row">
  {#if type == 'checkbox'}
    <slot />
    <span {...labelProps} on:click={labelProps.onClick} class:disabled class="checkLabel">{label}</span>
  {:else}
    <div class="label" {...labelProps} on:click={labelProps.onClick}>
      <div class="label">
        <span {...labelProps} on:click={labelProps.onClick} class:disabled>{label}</span>
      </div>
    </div>
    <div class="value">
      <slot />
    </div>
  {/if}
</div>

<style>
  .row {
    margin: 5px;
  }
  .label {
    margin-bottom: 3px;
    color: var(--theme-font-3);
  }
  .checkLabel {
    cursor: default;
    user-select: none;
  }
  .disabled {
    color: var(--theme-font-3);
  }
  .value {
    margin-left: 15px;
    margin-top: 3px;
  }
</style>
