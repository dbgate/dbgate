export const USER_COLOR_NAMES: string[] = [
  'red',
  'orange',
  'yellow',
  'lime',
  'green',
  'cyan',
  'blue',
  'purple',
  'magenta',
  'grey',
];

export function getNormalizedUserColorName(color: string): string | null {
  if (!color) return null;
  color = color.toLowerCase();
  if (USER_COLOR_NAMES.includes(color)) {
    return color;
  }
  if (color == 'volcano') {
    return 'red';
  }
  if (color == 'geekblue') {
    return 'blue';
  }
  if (color == 'gold') {
    return 'yellow';
  }
  return null;
}
