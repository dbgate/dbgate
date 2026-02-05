const getDiagramExport = (html, css, themeType, themeVariables, watermark) => {
  const watermarkHtml = watermark
    ? `
        <div style="position: fixed; bottom: 0; right: 0; padding: 5px; font-size: 12px; color: var(--theme-generic-font-grayed); background-color: var(--theme-datagrid-background); border-top-left-radius: 5px; border: var(--theme-card-border);">
        ${watermark}
      </div>
  `
    : '';
  
  // Convert theme variables object to CSS custom properties
  const themeVariablesCSS = themeVariables 
    ? `:root {\n${Object.entries(themeVariables).map(([key, value]) => `  ${key}: ${value};`).join('\n')}\n}`
    : '';
  
  return `<html>
  <meta charset='utf-8'>
  
  <head>
      <style>
        ${themeVariablesCSS}
        
        ${css}

        body {
          background: var(--theme-datagrid-background);
          color: var(--theme-generic-font);
        }
      </style>

      <link rel="stylesheet" href='https://cdn.jsdelivr.net/npm/@mdi/font@6.5.95/css/materialdesignicons.css' />

      <script>
  let lastX = null;
  let lastY = null;

  const handleMoveDown = e => {
    lastX = e.clientX;
    lastY = e.clientY;
    document.addEventListener('mousemove', handleMoveMove, true);
    document.addEventListener('mouseup', handleMoveEnd, true);
  };

  const handleMoveMove = e => {
    e.preventDefault();

    document.body.scrollLeft -= e.clientX - lastX;
    document.body.scrollTop -= e.clientY - lastY;

    lastX = e.clientX;
    lastY = e.clientY;
  };
  const handleMoveEnd = e => {
    e.preventDefault();
    e.stopPropagation();

    lastX = null;
    lastY = null;
    document.removeEventListener('mousemove', handleMoveMove, true);
    document.removeEventListener('mouseup', handleMoveEnd, true);
  };

  document.addEventListener('mousedown', handleMoveDown);
      </script>
  </head>
  
  <body class='${themeType == 'dark' ? 'theme-type-dark' : 'theme-type-light'}' style='user-select:none; cursor:pointer'>
      ${html}
      ${watermarkHtml}
  </body>
  
  </html>`;
};

module.exports = getDiagramExport;
