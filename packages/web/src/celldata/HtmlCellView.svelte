<script lang="ts">
  import _ from 'lodash';
  import DOMPurify from 'dompurify';

  export let selection;

  function cellToString(cell) {
    const { value } = cell;
    if (_.isPlainObject(value) || _.isArray(value)) return JSON.stringify(value, undefined, 2);
    if (value == null) return '';
    return String(value);
  }

  // Cell values are untrusted data coming from the database, so the HTML must be sanitized
  // before it is inserted into the DOM, otherwise stored XSS payloads (eg. <img onerror=...>)
  // would be executed in the context of the application
  $: sanitizedHtml = DOMPurify.sanitize(selection.map(cellToString).join('\n'));
</script>

{@html sanitizedHtml}
