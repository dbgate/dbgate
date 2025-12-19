export type JsonUiBlock =
  | { type: 'text'; text: string }
  | { type: 'heading'; text: string; level?: 1|2|3|4|5|6 }
  | { type: 'ticklist'; items: string[] }
  | { type: 'button'; text: string; link: string; newTab?: boolean };
