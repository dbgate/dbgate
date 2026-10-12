import DOMPurify from 'dompurify';
import { openWebLink } from './simpleTools';

// HTML from untrusted sources - database values, markdown from remote servers (GraphQL schema
// descriptions, npm plugin READMEs) and AI responses. DOMPurify removes scripts, event handlers
// and javascript: URLs; <style>, <form> and style attributes are removed as well, as they could
// restyle or overlay the application UI (e.g. a position:fixed element covering the whole window).
// With allowStyles, style attributes are kept - the caller must then render the HTML in a
// container that confines it (see SanitizedHtml).
export function sanitizeUntrustedHtml(html: string, { allowStyles = false } = {}): string {
  return DOMPurify.sanitize(html ?? '', {
    FORBID_TAGS: ['style', 'form'],
    FORBID_ATTR: allowStyles ? [] : ['style'],
  });
}

// Links in sanitized HTML must not navigate the application window - in the desktop app that
// window has Node.js access. They are opened externally instead, like markdown links.
export function handleUntrustedHtmlClick(e: MouseEvent) {
  const anchor = (e.target as Element)?.closest?.('a');
  if (!anchor) return;
  e.preventDefault();
  const href = anchor.getAttribute('href');
  if (href) openWebLink(href);
}
