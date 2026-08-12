<script context="module">
  export const matchingProps = ['conid'];
</script>

<script>
  import AiChatControl from '../ai/AiChatControl.svelte';
</script>

<AiChatControl {...$$props} assistantMode="serverChat" />
