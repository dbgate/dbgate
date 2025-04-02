const getDiagramExport = (html, css, themeType, themeClassName, watermark) => {
  const watermarkHtml = watermark
    ? `
        <div style="position: fixed; bottom: 0; right: 0; padding: 5px; font-size: 12px; color: var(--theme-font-2); background-color: var(--theme-bg-2); border-top-left-radius: 5px; border: 1px solid var(--theme-border);">
        ${watermark}
      </div>
  `
    : '';
  return `<html>
  <meta charset='utf-8'>
  
  <head>
      <style>
        ${css}

        body {
          background: var(--theme-bg-1);
          color: var(--theme-font-1);
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
  
  <body class='${themeType == 'dark' ? 'theme-type-dark' : 'theme-type-light'} ${themeClassName}' style='user-select:none; cursor:pointer'>
      ${html}
      ${watermarkHtml}
  </body>
  
  </html>`;
};

module.exports = getDiagramExport;
