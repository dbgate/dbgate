export default function formatXml(xml: string): string {
  if (typeof xml !== 'string') return '';

  xml = xml.replace(/>\s*</g, '><');

  let formatted = '';
  let indent = 0;

  const tags = xml.split(/(<.*?>)/g).filter(s => s.trim());

  for (let tag of tags) {
    if (tag.startsWith('</')) {
      indent--;
      formatted += '\n' + '  '.repeat(indent) + tag;
    } else if (tag.startsWith('<') && !tag.endsWith('/>') && !tag.startsWith('<?')) {
      formatted += '\n' + '  '.repeat(indent) + tag;
      indent++;
    } else {
      formatted += '\n' + '  '.repeat(indent) + tag;
    }
  }

  return formatted.trim();
}
