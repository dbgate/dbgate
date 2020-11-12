import _ from 'lodash';
import { accentColor, darkenByTenth, getColorType, lightenByTenth } from './colorUtil';
import { generate, presetPalettes, presetDarkPalettes, presetPrimaryColors } from '@ant-design/colors';

function fillOne(theme, name, type, add, background, fontName, invFontName, changeLightFunc, fontPalettes) {
  add[`${name}_font1`] = add[`${fontName}1`];
  add[`${name}_font2`] = add[`${fontName}2`];
  add[`${name}_font3`] = add[`${fontName}3`];

  add[`${name}_invfont1`] = add[`${invFontName}1`];
  add[`${name}_invfont2`] = add[`${invFontName}2`];
  add[`${name}_invfont3`] = add[`${invFontName}3`];
  // add[`${name}_fontDisabled`] = add.fontBlack3;

  if (background) {
    add[`${name}_background1`] = background;
    add[`${name}_background2`] = changeLightFunc(add[`${name}_background1`]);
    add[`${name}_background3`] = changeLightFunc(add[`${name}_background2`]);
    add[`${name}_background4`] = changeLightFunc(add[`${name}_background3`]);
  }

  for (const colorName in presetPrimaryColors) {
    add[`${name}_font_${colorName}`] = fontPalettes[colorName];
    if (background) {
      add[`${name}_background_${colorName}`] = generate(presetPrimaryColors[colorName], {
        theme: type,
        backgroundColor: background,
      });

      add[`${name}_selection`] = generate(
        theme.selectionAntName ? presetPrimaryColors[theme.selectionAntName] : theme.selectionBaseColor,
        {
          theme: type,
          backgroundColor: background,
        }
      );
    }
  }

  add[`${name}_font_hover`] = add[`${name}_font_geekblue`][8];
  add[`${name}_font_link`] = add[`${name}_font_geekblue`][7];

  if (background) {
    add[`${name}_background_alt2`] = changeLightFunc(add[`${name}_background1`], type == 'light' ? 0.05 : 0.1);
    add[`${name}_background_alt3`] = add[`${name}_background_geekblue`][type == 'light' ? 0 : 1];
  }
}

function fillThemeCore(theme) {
  const add = { ...theme };
  add.fontWhite1 = add.fontWhite1 || '#FFFFFF';
  add.fontWhite2 = add.fontWhite2 || darkenByTenth(add.fontWhite1, 0.3);
  add.fontWhite3 = add.fontWhite3 || darkenByTenth(add.fontWhite2, 0.2);

  add.fontBlack1 = add.fontBlack1 || '#000000';
  add.fontBlack2 = add.fontBlack2 || lightenByTenth(add.fontBlack1, 0.3);
  add.fontBlack3 = add.fontBlack3 || lightenByTenth(add.fontBlack2, 0.2);

  for (const key of _.keys(theme)) {
    const matchType = key.match(/^(.*)_type$/);
    const matchBg = key.match(/^(.*)_background$/);
    if (!matchType && !matchBg) continue;
    const name = matchType ? matchType[1] : matchBg[1];
    if (matchBg && theme[`${name}_type`]) continue;

    const type = matchType ? theme[key] : getColorType(theme[key]);
    if (type != 'light' && type != 'dark') continue;

    const background = theme[`${name}_background`];
    if (type == 'light') {
      fillOne(theme, name, type, add, background, 'fontBlack', 'fontWhite', darkenByTenth, presetPalettes);
    }
    if (type == 'dark') {
      fillOne(theme, name, type, add, background, 'fontWhite', 'fontBlack', lightenByTenth, presetDarkPalettes);
    }
  }

  if (add.main_type == 'dark') add.main_palettes = presetDarkPalettes;
  else add.main_palettes = presetPalettes;

  return {
    ...add,
    ...theme,
  };
}

export default function fillTheme(theme) {
  theme = fillThemeCore(theme);
  console.log('THEME', theme);
  return theme;
}
