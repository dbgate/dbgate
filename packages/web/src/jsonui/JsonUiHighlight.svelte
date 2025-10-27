<script lang="ts">
  export let text: string;
  export let colorClass: string = 'premium-gradient';
</script>

<div class="highlight {colorClass}">
  {text}
</div>

<style>
  .highlight {
    text-align: center;
    margin: 10px;
    font-size: large;
    font-weight: bold;
    border: 1px solid;
    padding: 5px;
  }
</style>
