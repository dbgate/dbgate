<script lang="ts">
  import _ from 'lodash';
  import SanitizedHtml from '../elements/SanitizedHtml.svelte';

  export let selection;

  function cellToString(cell) {
    const { value } = cell;
    if (_.isPlainObject(value) || _.isArray(value)) return JSON.stringify(value, undefined, 2);
    if (value == null) return '';
    return String(value);
  }

  // Cell values are untrusted data coming from the database, so SanitizedHtml sanitizes the HTML
  // before it is inserted into the DOM, otherwise stored XSS payloads (eg. <img onerror=...>)
  // would be executed in the context of the application. Inline styles are kept, as stored HTML
  // (e-mails, templates) relies on them; SanitizedHtml confines the styled content to its box.
</script>

<SanitizedHtml html={selection.map(cellToString).join('\n')} allowStyles />
