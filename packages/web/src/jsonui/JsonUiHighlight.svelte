<script lang="ts">
  import { openWebLink } from '../utility/simpleTools';

  export let text: string;
  export let colorClass: string = 'premium-gradient';
  export let link: string;
</script>

<div
  class="highlight {colorClass}"
  class:isLink={!!link}
  on:click={() => {
    if (link) {
      openWebLink(link);
    }
  }}
>
  {text}
</div>

<style>
  .highlight {
    display: block;
    text-align: center;
    margin: 10px;
    font-size: large;
    font-weight: bold;
    border: 1px solid;
    padding: 5px;
  }

  .highlight.isLink {
    cursor: pointer;
  }
</style>
