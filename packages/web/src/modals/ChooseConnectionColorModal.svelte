<script lang="ts">
  import ColorSelector from '../forms/ColorSelector.svelte';
  import { apiCall } from '../utility/api';
  import { useConnectionColor } from '../utility/useConnectionColor';
  import ModalBase from './ModalBase.svelte';

  export let conid;
  export let database;
  export let header;
  export let text;

  const initialColor = useConnectionColor({ conid, database }, null, null, false, false);

  $: value = $initialColor;
</script>

<ModalBase {...$$restProps}>
  <svelte:fragment slot="header">{header}</svelte:fragment>

  <div class="m-2">
    {text}
  </div>

  <ColorSelector
    {value}
    on:change={e => {
      value = e.detail;

      if (database) {
        apiCall('connections/update-database', {
          conid,
          database,
          values: { connectionColor: e.detail },
        });
      } else {
        apiCall('connections/update', {
          _id: conid,
          values: { connectionColor: e.detail },
        });
      }
    }}
  />
</ModalBase>
