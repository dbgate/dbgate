const getDiagramSvgExport = (html, css, themeType, themeClassName) => {
  // Parse the HTML to extract SVG elements and structure
  // The diagram canvas contains SVG elements for relationships and HTML div elements for tables

  // Extract all the styles needed for the SVG
  const svgStyles = `
    <style>
      ${css}
      
      .canvas {
        font-family: Arial, sans-serif;
      }
      
      /* Theme colors */
      ${
        themeType === 'dark'
          ? `
        .theme-type-dark {
          --theme-bg-1: #1e1e1e;
          --theme-bg-2: #2d2d30;
          --theme-bg-3: #3e3e42;
          --theme-bg-4: #555555;
          --theme-font-1: #cccccc;
          --theme-font-2: #999999;
          --theme-border: #3e3e42;
        }
      `
          : `
        .theme-type-light {
          --theme-bg-1: #ffffff;
          --theme-bg-2: #f3f3f3;
          --theme-bg-3: #e5e5e5;
          --theme-bg-4: #cccccc;
          --theme-font-1: #000000;
          --theme-font-2: #666666;
          --theme-border: #cccccc;
        }
      `
      }
    </style>
  `;

  // Wrap the HTML content in an SVG foreignObject to make it work as pure SVG
  // This allows us to embed HTML content (tables) inside SVG while maintaining SVG format
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" class="${
    themeType == 'dark' ? 'theme-type-dark' : 'theme-type-light'
  } ${themeClassName}">
  ${svgStyles}
  <foreignObject x="0" y="0" width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" class="canvas">
      ${html}
    </div>
  </foreignObject>
</svg>`;
};

module.exports = getDiagramSvgExport;
