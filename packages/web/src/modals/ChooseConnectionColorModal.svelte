<script lang="ts">
  import ColorSelector from '../forms/ColorSelector.svelte';
  import axiosInstance from '../utility/axiosInstance';
  import { useConnectionColor } from '../utility/useConnectionColor';
  import ModalBase from './ModalBase.svelte';

  export let conid;
  export let database;

  const initialColor = useConnectionColor({ conid, database }, null);

  $: value = $initialColor;
</script>

<ModalBase {...$$restProps}>
  <ColorSelector
    {value}
    on:change={e => {
      value = e.detail;

      axiosInstance.post('connections/update', {
        _id: conid,
        values: { connectionColor: e.detail },
      });
    }}
  />
</ModalBase>
