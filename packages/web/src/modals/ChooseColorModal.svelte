<script lang="ts">
  import ColorSelector from '../forms/ColorSelector.svelte';
  import ModalBase from './ModalBase.svelte';

  export let color;
  export let header;
  export let onChange;

  $: value = color;
</script>

<ModalBase {...$$restProps}>
  <svelte:fragment slot="header">{header}</svelte:fragment>

  <ColorSelector
    {value}
    on:change={e => {
      value = e.detail;
      onChange(value);
    }}
  />
</ModalBase>
