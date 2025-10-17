<script lang="ts">
  export let items: string[] = [];
</script>

<ul class="ticklist">
  {#each items as item}
    <li>{item}</li>
  {/each}
</ul>

<style>
  .ticklist {
    margin: 10px;
    padding: 0;
    list-style: none;
    padding-left: 0;
  }
  .ticklist li::before {
    content: '✔︎ ';
    color: var(--theme-icon-green);
  }
</style>
