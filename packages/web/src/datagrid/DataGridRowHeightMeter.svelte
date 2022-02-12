<script lang="ts" context="module">
  export const dataGridRowHeight = writable(0);
</script>

<script lang="ts">
  import { writable } from 'svelte/store';
  import InlineButton from '../buttons/InlineButton.svelte';
  import FontIcon from '../icons/FontIcon.svelte';
  import resizeObserver from '../utility/resizeObserver';

  $: console.log('dataGridRowHeight', $dataGridRowHeight);
</script>

<div>
  <table>
    <tr>
      <td
        use:resizeObserver={true}
        on:resize={e => {
          // @ts-ignore
          $dataGridRowHeight = e.detail.height + 1;
        }}
      >
        title
        <InlineButton square>
          <FontIcon icon="icon chevron-down" />
        </InlineButton>
      </td>
    </tr>
  </table>
</div>

<style>
  div {
    position: fixed;
    left: -1000px;
    top: -1000px;
    visibility: hidden;
  }
  td {
    display: flex;
  }
</style>
