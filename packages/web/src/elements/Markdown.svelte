<script>
  import SvelteMarkdown from 'svelte-markdown';
  import Link from './Link.svelte';
  import MarkdownHtml from './MarkdownHtml.svelte';

  export let source;
</script>

<SvelteMarkdown {source} renderers={{ link: Link, html: MarkdownHtml }} />
