<script lang="ts">
  export let text: string;
  export let colorClass: string = 'premium-gradient';
  export let link: string;
</script>

{#if link}
  <a class="highlight {colorClass}" href={link}>
    {text}
  </a>
{:else}
  <div class="highlight {colorClass}">
    {text}
  </div>
{/if}

<style>
  .highlight {
    display: block;
    text-align: center;
    margin: 10px;
    font-size: large;
    font-weight: bold;
    border: 1px solid;
    padding: 5px;
    text-decoration: none;
  }
</style>
