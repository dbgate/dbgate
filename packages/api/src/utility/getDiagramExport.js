const getDiagramExport = (html, css, themeType, themeClassName) => {
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
  </head>
  
  <body class='${themeType == 'dark' ? 'theme-type-dark' : 'theme-type-light'} ${themeClassName}'>
      ${html}
  </body>
  
  </html>`;
};

module.exports = getDiagramExport;
