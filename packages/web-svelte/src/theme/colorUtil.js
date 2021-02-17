// https://css-tricks.com/using-javascript-to-adjust-saturation-and-brightness-of-rgb-colors/

export function hexToRgb(rgb) {
  if (!rgb) throw new Error(`Ivalid RGB color: ${rgb}`);
  if (rgb.match(/^#[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]$/)) {
    rgb = `#${rgb[1]}${rgb[1]}${rgb[2]}${rgb[2]}${rgb[3]}${rgb[3]}`;
  }
  if (!rgb.match(/^#[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]$/)) {
    throw new Error(`Ivalid RGB color: ${rgb}`);
  }
  return [rgb.substring(1, 3), rgb.substring(3, 5), rgb.substring(5, 7)].map(x => parseInt(x, 16));
}

function componentToHex(c) {
  let num = Math.round(c);
  if (num < 0) num = 0;
  if (num > 255) num = 255;
  var hex = num.toString(16);
  return hex.length == 1 ? '0' + hex : hex;
}

export function rgbToHex(r, g, b) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function getLightnessOfRGB(rgb) {
  // First convert to an array of integers by removing the whitespace, taking the 3rd char to the 2nd last then splitting by ','
  const rgbIntArray = hexToRgb(rgb);

  // Get the highest and lowest out of red green and blue
  const highest = Math.max(...rgbIntArray);
  const lowest = Math.min(...rgbIntArray);

  // Return the average divided by 255
  return (highest + lowest) / 2 / 255;
}

export function getColorType(rgb) {
  return getLightnessOfRGB(rgb) > 0.5 ? 'light' : 'dark';
}

export function saturateByTenth(rgb) {
  const rgbIntArray = hexToRgb(rgb);
  const grayVal = getLightnessOfRGB(rgb) * 255;
  const [lowest, middle, highest] = getLowestMiddleHighest(rgbIntArray);

  if (lowest.val === highest.val) {
    return rgb;
  }

  const saturationRange = Math.round(Math.min(255 - grayVal, grayVal));
  const maxChange = Math.min(255 - highest.val, lowest.val);
  const changeAmount = Math.min(saturationRange / 10, maxChange);
  const middleValueRatio = (grayVal - middle.val) / (grayVal - highest.val);

  const returnArray = [];
  returnArray[highest.index] = Math.round(highest.val + changeAmount);
  returnArray[lowest.index] = Math.round(lowest.val - changeAmount);
  returnArray[middle.index] = Math.round(grayVal + (returnArray[highest.index] - grayVal) * middleValueRatio);
  return `rgb(${[returnArray].join()})`;
}

function getLowestMiddleHighest(rgbIntArray) {
  let highest = { val: -1, index: -1 };
  let lowest = { val: Infinity, index: -1 };

  rgbIntArray.map((val, index) => {
    if (val > highest.val) {
      highest = { val: val, index: index };
    }
    if (val < lowest.val) {
      lowest = { val: val, index: index };
    }
  });

  if (lowest.index === highest.index) {
    lowest.index = highest.index + 1;
  }

  let middle = { index: 3 - highest.index - lowest.index };
  middle.val = rgbIntArray[middle.index];
  return [lowest, middle, highest];
}

export function lightenByTenth(rgb, ratio = 0.1) {
  const rgbIntArray = hexToRgb(rgb);
  // Grab the values in order of magnitude
  // This uses the getLowestMiddleHighest function from the saturate section
  const [lowest, middle, highest] = getLowestMiddleHighest(rgbIntArray);

  if (lowest.val === 255) {
    return rgb;
  }

  const returnArray = [];

  // First work out increase on lower value
  returnArray[lowest.index] = Math.round(lowest.val + Math.min(255 - lowest.val, 255 * ratio));

  // Then apply to the middle and higher values
  const increaseFraction = (returnArray[lowest.index] - lowest.val) / (255 - lowest.val);
  returnArray[middle.index] = middle.val + (255 - middle.val) * increaseFraction;
  returnArray[highest.index] = highest.val + (255 - highest.val) * increaseFraction;

  // Convert the array back into an rgb string
  return rgbToHex(...returnArray);
}

export function darkenByTenth(rgb, ratio = 0.1) {
  // Our rgb to int array function again
  const rgbIntArray = hexToRgb(rgb);
  //grab the values in order of magnitude
  //this uses the function from the saturate function
  const [lowest, middle, highest] = getLowestMiddleHighest(rgbIntArray);

  if (highest.val === 0) {
    return rgb;
  }

  const returnArray = [];

  returnArray[highest.index] = highest.val - Math.min(highest.val, 255 * ratio);
  const decreaseFraction = (highest.val - returnArray[highest.index]) / highest.val;
  returnArray[middle.index] = middle.val - middle.val * decreaseFraction;
  returnArray[lowest.index] = lowest.val - lowest.val * decreaseFraction;

  // Convert the array back into an rgb string
  return rgbToHex(...returnArray);
}

export function desaturateByTenth(rgb) {
  const rgbIntArray = hexToRgb(rgb);
  //grab the values in order of magnitude
  //this uses the getLowestMiddleHighest function from the saturate section
  const [lowest, middle, highest] = getLowestMiddleHighest(rgbIntArray);
  const grayVal = getLightnessOfRGB(rgb) * 255;

  if (lowest.val === highest.val) {
    return rgb;
  }

  const saturationRange = Math.round(Math.min(255 - grayVal, grayVal));
  const maxChange = grayVal - lowest.val;
  const changeAmount = Math.min(saturationRange / 10, maxChange);

  const middleValueRatio = (grayVal - middle.val) / (grayVal - highest.val);

  const returnArray = [];
  returnArray[highest.index] = Math.round(highest.val - changeAmount);
  returnArray[lowest.index] = Math.round(lowest.val + changeAmount);
  returnArray[middle.index] = Math.round(grayVal + (returnArray[highest.index] - grayVal) * middleValueRatio);
  return rgbToHex(...returnArray);
}

export function accentColor(rgb, index, ratio = 0.1) {
  const rgbIntArray = hexToRgb(rgb);
  const returnArray = rgbIntArray.map((v, i) => {
    if (i == index) return v + 255 * ratio;
    return v - 128 * ratio;
  });

  return rgbToHex(...returnArray);
}
