<script>
  import SvelteMarkdown from 'svelte-markdown';
  import Link from './Link.svelte';

  export let source;
</script>

<SvelteMarkdown {source} renderers={{ link: Link }} />
