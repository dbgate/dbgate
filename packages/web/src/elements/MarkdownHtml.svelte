<script lang="ts">
  // Renderer for raw HTML inside markdown. The default svelte-markdown renderer inserts it
  // unsanitized, and the markdown shown in DbGate often comes from untrusted sources.
  import SanitizedHtml from './SanitizedHtml.svelte';

  export let text;
</script>

<SanitizedHtml html={text} />
