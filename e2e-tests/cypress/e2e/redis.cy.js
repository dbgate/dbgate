Cypress.on('uncaught:exception', (err, runnable) => {
  // if the error message matches the one about WorkerGlobalScope importScripts
  if (err.message.includes("Failed to execute 'importScripts' on 'WorkerGlobalScope'")) {
    // return false to let Cypress know we intentionally want to ignore this error
    return false;
  }
  // otherwise let Cypress throw the error
});

beforeEach(() => {
  cy.visit('http://localhost:3000');
  cy.viewport(1250, 900);
});

describe('Redis data', () => {
  it('String test', () => {
    cy.contains('Redis-connection').click();
    cy.contains('db1').click();
    cy.contains('app').click();
    cy.contains('version').click();
    cy.testid('RedisValueDetail_AceEditor').click().realPress('Backspace').realType('1');
    cy.contains('Save').click();
    cy.contains('OK').click();
  });

  it('Hash test', () => {
    cy.contains('Redis-connection').click();
    cy.contains('db1').click();
    cy.contains('user').click();
    cy.contains('alice').click();
    cy.testid('RedisKeyDetailTab_RenameKeyButton').click();
    cy.themeshot('redis-rename-key');
    cy.realType('3');
    cy.contains('OK').click();
    cy.contains('age').click();
    cy.testid('RedisValueHashDetail_ValueSection').click().realPress('Backspace').realType('8');
    cy.contains('Add field').click();
    cy.testid('RedisValueListLikeEdit_key').click().realType('phone');
    cy.testid('RedisValueListLikeEdit_value').click().realType('123-456-7890');
    cy.contains('Refresh').click();
    cy.themeshot('redis-hash-edit');
    cy.contains('Save').click();
    cy.themeshot('redis-hash-script-edit');
    cy.contains('OK').click();
  });

  it('List test', () => {
    cy.contains('Redis-connection').click();
    cy.contains('db1').click();
    cy.contains('queue').click();
    cy.contains('emails').click();
    cy.contains('Add field').click();
    cy.testid('RedisValueListLikeEdit_value').click().realType('reset');
    cy.contains('Save').click();
    cy.contains('OK').click();
  });

  it('Set test', () => {
    cy.contains('Redis-connection').click();
    cy.contains('db1').click();
    cy.contains('tags').click();
    cy.contains('Add field').click();
    cy.testid('RedisValueListLikeEdit_value').click().realType('newtag');
    cy.contains('Save').click();
    cy.contains('OK').click();
  });

  it('ZSet test', () => {
    cy.contains('Redis-connection').click();
    cy.contains('db1').click();
    cy.contains('leaderboard').click();
    cy.contains('alice').click();
    cy.testid('RedisValueZSetDetail_score')
      .click()
      .realPress('Backspace')
      .realPress('Backspace')
      .realPress('Backspace')
      .realType('35');
    cy.contains('Save').click();
    cy.contains('OK').click();
    cy.contains('35').should('exist');
  });

  it('JSON test', () => {
    cy.contains('Redis-connection').click();
    cy.contains('db1').click();
    cy.contains('user').click();
    cy.contains('1:*').click();
    cy.contains('json').click();
    cy.testid('RedisValueDetail_displaySelect').select('JSON view');
    cy.themeshot('redis-json-detail');
  });

  it('Stream test', () => {
    cy.contains('Redis-connection').click();
    cy.contains('db1').click();
    cy.contains('events').click();
    cy.contains('Add field').click();
    cy.testid('RedisValueListLikeEdit_field').click().realType('message');
    cy.testid('RedisValueListLikeEdit_value').click().realType('Hello, World!');
    cy.contains('Save').click();
    cy.contains('OK').click();
    cy.themeshot('redis-stream');
  });

  it('Add key', () => {
    cy.contains('Redis-connection').click();
    cy.contains('db1').click();
    cy.testid('RedisKeysTree_addKeyDropdown').click();
    cy.contains('String').click();
    cy.testid('NewRedisKeyTab_keyName').click().realType('newstringkey');
    cy.testid('RedisValueDetail_AceEditor').click().realType('This is a new string key.');
    cy.contains('Save').click();
    cy.contains('OK').click();
    cy.contains('newstringkey').should('exist');
    cy.testid('RedisKeysTree_addKeyDropdown').click();
    cy.contains('Hash').click();
    cy.themeshot('redis-add-hash-key');
  });
});
