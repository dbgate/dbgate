<script lang="ts">
  import ColorSelector from '../forms/ColorSelector.svelte';
  import axiosInstance from '../utility/axiosInstance';
  import { useConnectionColor } from '../utility/useConnectionColor';
  import ModalBase from './ModalBase.svelte';

  export let conid;
  export let database;
  export let header;

  const initialColor = useConnectionColor({ conid, database }, null, null, false, false);

  $: value = $initialColor;
</script>

<ModalBase {...$$restProps}>
  <svelte:fragment slot="header">{header}</svelte:fragment>

  <ColorSelector
    {value}
    on:change={e => {
      value = e.detail;

      if (database) {
        axiosInstance.post('connections/update-database', {
          conid,
          database,
          values: { databaseColor: e.detail },
        });
      } else {
        axiosInstance.post('connections/update', {
          _id: conid,
          values: { connectionColor: e.detail },
        });
      }
    }}
  />
</ModalBase>
