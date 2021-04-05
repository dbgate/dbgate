<script>
  export let expanded;
</script>
<style>
  .container {
    display: inline-block;
    cursor: pointer;
    transform: translate(calc(0px - var(--li-identation)), -50%);
    position: absolute;
    top: 50%;
    padding-right: 100%;
  }
  .arrow {
    transform-origin: 25% 50%;
    position: relative;
    line-height: 1.1em;
    font-size: 0.75em;
    margin-left: 0;
    transition: 150ms;
    color: var(--arrow-sign);
    user-select: none;
    font-family: 'Courier New', Courier, monospace;
  }
  .expanded {
    transform: rotateZ(90deg) translateX(-3px);
  }
</style>

<div class="container" on:click>
  <div class="arrow" class:expanded={expanded}>{'\u25B6'}</div>
</div>