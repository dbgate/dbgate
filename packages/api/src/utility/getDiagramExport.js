const getDiagramExport = (html,css) => {
    return `<html>
  <meta charset='utf-8'>
  
  <head>
      <style>
        ${css}
      </style>

      <link rel="stylesheet" href='https://cdn.jsdelivr.net/npm/@mdi/font@6.5.95/css/materialdesignicons.css' />
  </head>
  
  <body class='theme-light'>
      ${html}
  </body>
  
  </html>`;
  };
  
  module.exports = getDiagramExport;
  