// fuzzy.filter wraps matched characters in its `pre`/`post` strings without escaping the rest of
// the text, so its output must never be inserted as HTML - the texts are table, column and
// database names, which come from the database. These control characters are used as markers
// instead, and the result is split back into plain text segments that are rendered as text.
export const HIGHLIGHT_START = '\u0001';
export const HIGHLIGHT_END = '\u0002';

export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

export function splitHighlightedText(value: string): HighlightSegment[] {
  const res: HighlightSegment[] = [];
  let current = '';
  let highlighted = false;

  const flush = () => {
    if (current) res.push({ text: current, highlighted });
    current = '';
  };

  for (const char of value ?? '') {
    if (char == HIGHLIGHT_START) {
      flush();
      highlighted = true;
    } else if (char == HIGHLIGHT_END) {
      flush();
      highlighted = false;
    } else {
      current += char;
    }
  }
  flush();
  return res;
}
