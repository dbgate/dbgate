const path = require('path');

// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add('testid', (testId, options = {}) => {
  return cy.get(`[data-testid="${testId}"]`, options);
});

Cypress.Commands.add(
  'themeshot',
  {
    prevSubject: 'optional',
  },
  (subject, file, options) => {
    cy.window().then(win => {
      win.__changeCurrentTheme('theme-dark');
    });

    // cy.screenshot(`${file}-dark`, {
    //   onAfterScreenshot: (doc, props) => {
    //     cy.task('renameFile', {
    //       from: props.path,
    //       to: path.resolve(__dirname, `../../screenshots/${file}-dark.png`),
    //     });

    //     // fs.rename(props.path, path.resolve(path.join(__dirname, `../../screenshots/${file}-dark.png`)));
    //   },
    // });

    if (subject) {
      cy.wrap(subject).screenshot(`${file}-dark`, options);
    } else {
      cy.screenshot(`${file}-dark`, options);
    }
    // .then(props => {
    //   return cy.task('renameFile', {
    //     from: props.path,
    //     to: path.resolve(__dirname, `../../screenshots/${file}-dark.png`),
    //   });
    // });

    cy.window().then(win => {
      win.__changeCurrentTheme('theme-light');
    });

    if (subject) {
      cy.wrap(subject).screenshot(`${file}-light`, options);
    } else {
      cy.screenshot(`${file}-light`, options);
    }
    // .then(props => {
    //   return cy.task('renameFile', {
    //     from: props.path,
    //     to: path.resolve(__dirname, `../../screenshots/${file}-light.png`),
    //   });
    // });

    // cy.screenshot(`${file}-light`, {
    //   onAfterScreenshot: (doc, props) => {
    //     cy.task('renameFile', {
    //       from: props.path,
    //       to: path.resolve(__dirname, `../../screenshots/${file}-light.png`),
    //     });

    //     // fs.rename(props.path, path.resolve(path.join(__dirname, `../../screenshots/${file}-light.png`)));
    //   },
    // });
  }
);
