<script lang="ts">
  import { createTwoFilesPatch } from 'diff';
  import { html, parse } from 'diff2html';
  import DOMPurify from 'dompurify';

  export let leftText;
  export let rightText;
  export let leftTitle;
  export let rightTitle;

  $: unifiedDiff = createTwoFilesPatch(leftTitle, rightTitle, leftText, rightText, '', '');
  $: diffJson = parse(unifiedDiff);
  // $: diffHtml = html(diffJson, { outputFormat: 'side-by-side', drawFileList: false });
  $: diffHtml = html(diffJson, { drawFileList: false });
  // diff2html escapes the diffed content, but the result is inserted with {@html}, so it is
  // sanitized as well - the diffed texts are untrusted (database objects, scripts, saved files)
  // and this keeps a single, explicit place where that guarantee is enforced
  $: sanitizedDiffHtml = DOMPurify.sanitize(diffHtml);
</script>

<div class="root">
  {@html sanitizedDiffHtml}
</div>

<style>
  .root {
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    overflow-y: scroll;

    background: white;
    color: #000000;
  }
  /* :global(.d2h-file-diff) {
    overflow-y: scroll;
    max-height: 300px;
  }

  :global(.d2h-code-wrapper) {
    position: relative;
  } */
</style>
