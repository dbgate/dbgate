<script lang="ts">
  import { onMount } from 'svelte';

  export let colorClass: string = 'premium-gradient';
  export let validTo;

  function formatRemaining(validTo, now) {
    let diffMs = validTo.getTime() - now.getTime();
    if (diffMs <= 0) return '0 minutes';

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    const en = (n, unit) => ({
      num: n,
      unit: n == 1 ? unit : unit + 's',
    });

    if (days) parts.push(en(days, 'day'));
    if (hours) parts.push(en(hours, 'hour'));
    // Always include minutes to report down to minutes
    parts.push(en(minutes, 'minute'));

    return parts;
  }

  let currentDate = new Date();

  onMount(() => {
    const interval = setInterval(() => {
      currentDate = new Date();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  });

  $: parts = formatRemaining(new Date(validTo), currentDate);
</script>

{#if validTo}
  <div class="countdown {colorClass}">
    <span class="big">Offer ends in:</span><br />
    {#each parts as part}
      <span class="part">
        <span class="big">{part.num}</span>
        {part.unit}
      </span>
    {/each}
  </div>
{/if}

<style>
  .countdown {
    text-align: center;
    margin: 10px;
    border: 1px solid;
    padding: 5px;
  }

  .big {
    font-size: large;
    font-weight: bold;
  }

  .part {
    margin: 0 5px;
  }
</style>
