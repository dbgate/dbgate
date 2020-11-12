import { useCurrentTheme } from '../utility/globalState';
import light from './light';
import dark from './dark';

const themes = { light, dark };

export default function useTheme() {
  const currentTheme = useCurrentTheme();
  return themes[currentTheme] || light;
}
