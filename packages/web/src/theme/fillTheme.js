import _ from 'lodash';
import { accentColor, darkenByTenth, lightenByTenth } from './colorUtil';
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
    add[`${name}_background_alt2`] = changeLightFunc(add[`${name}_background1`], 0.05);
    add[`${name}_background_alt3`] = add[`${name}_background_geekblue`][0];
  }
}

export default function fillTheme(theme) {
  const add = {};
  add.fontWhite1 = theme.fontWhite1 || '#FFFFFF';
  add.fontWhite2 = theme.fontWhite2 || darkenByTenth(add.fontWhite1, 0.3);
  add.fontWhite3 = theme.fontWhite3 || darkenByTenth(add.fontWhite2, 0.2);

  add.fontBlack1 = theme.fontBlack1 || '#000000';
  add.fontBlack2 = theme.fontBlack2 || lightenByTenth(add.fontBlack1, 0.3);
  add.fontBlack3 = theme.fontBlack3 || lightenByTenth(add.fontBlack2, 0.2);

  for (const key of _.keys(theme)) {
    const match = key.match(/(.*)_type/);
    if (!match) continue;
    const name = match[1];
    const type = theme[key];
    if (type != 'light' && type != 'dark') continue;

    const background = theme[`${name}_background`];
    if (type == 'light') {
      fillOne(theme, name, type, add, background, 'fontBlack', 'fontWhite', darkenByTenth, presetPalettes);
    }
    if (type == 'dark') {
      fillOne(theme, name, type, add, background, 'fontWhite', 'fontBlack', lightenByTenth, presetDarkPalettes);
    }
    // add[`${name}_fontr`] = accentColor(add[`${name}_font1`], 0, 0.6);
    // add[`${name}_fontg`] = accentColor(add[`${name}_font1`], 1, 0.6);
    // add[`${name}_fontb`] = accentColor(add[`${name}_font1`], 2, 0.6);

    // if (background) {
    //   add[`${name}_backgroundr`] = accentColor(add[`${name}_background1`], 0);
    //   add[`${name}_backgroundg`] = accentColor(add[`${name}_background1`], 1);
    //   add[`${name}_backgroundb`] = accentColor(add[`${name}_background1`], 2);
    // }
  }
  console.log('COLORS', {
    ...add,
    ...theme,
  });
  return {
    ...add,
    ...theme,
  };
}
