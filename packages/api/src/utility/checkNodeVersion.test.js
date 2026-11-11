const fs = require('fs');
const path = require('path');
const {
  MIN_NODE_MAJOR,
  isNodeVersionSupported,
  getNodeVersionWarning,
  checkNodeVersion,
} = require('./checkNodeVersion');

function createLogger() {
  return { error: jest.fn(), warn: jest.fn(), info: jest.fn() };
}

describe('MIN_NODE_MAJOR', () => {
  test('is 24', () => {
    expect(MIN_NODE_MAJOR).toBe(24);
  });
});

describe('isNodeVersionSupported', () => {
  test.each(['18.20.4', '22.11.0', 'v18.0.0'])('%s is not supported', version => {
    expect(isNodeVersionSupported(version)).toBe(false);
  });

  test.each(['24.0.0', '25.1.0', '24.1.0'])('%s is supported', version => {
    expect(isNodeVersionSupported(version)).toBe(true);
  });

  test.each(['', 'abc'])('unparsable version %p is treated as supported', version => {
    expect(isNodeVersionSupported(version)).toBe(true);
  });

  test('defaults to current process version without throwing', () => {
    expect(typeof isNodeVersionSupported()).toBe('boolean');
  });
});

describe('getNodeVersionWarning', () => {
  test('returns message with required and current version for old node', () => {
    const msg = getNodeVersionWarning('18.20.4');
    expect(typeof msg).toBe('string');
    expect(msg).toContain('24');
    expect(msg).toContain('18.20.4');
    expect(msg).toContain('https://nodejs.org');
  });

  test('returns null for supported version', () => {
    expect(getNodeVersionWarning('24.0.0')).toBeNull();
  });

  test('returns null for unparsable version', () => {
    expect(getNodeVersionWarning('abc')).toBeNull();
  });
});

describe('checkNodeVersion', () => {
  test('logs DBGM-00000 error once and returns false for old node', () => {
    const logger = createLogger();
    const res = checkNodeVersion(logger, '18.20.4');
    expect(res).toBe(false);
    expect(logger.error).toHaveBeenCalledTimes(1);
    const message = logger.error.mock.calls[0].find(x => typeof x == 'string');
    expect(message).toMatch(/^DBGM-00000 /);
    expect(message).toContain('18.20.4');
    expect(message).toContain('24');
  });

  test('does not log error and returns true for node 24', () => {
    const logger = createLogger();
    const res = checkNodeVersion(logger, '24.0.0');
    expect(res).toBe(true);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('treats v-prefixed old version as unsupported', () => {
    const logger = createLogger();
    expect(checkNodeVersion(logger, 'v18.0.0')).toBe(false);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  test('never throws for garbage input', () => {
    const logger = createLogger();
    expect(() => checkNodeVersion(logger, 'garbage')).not.toThrow();
    expect(logger.error).not.toHaveBeenCalled();
  });
});

describe('main.js integration (static check)', () => {
  test('start() calls checkNodeVersion before server starts listening', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf-8');
    expect(source).toMatch(/require\(['"]\.\/utility\/checkNodeVersion['"]\)/);

    const startIndex = source.indexOf('function start()');
    expect(startIndex).toBeGreaterThanOrEqual(0);
    const callIndex = source.indexOf('checkNodeVersion(', startIndex);
    const listenIndex = source.indexOf('.listen(', startIndex);
    expect(callIndex).toBeGreaterThan(startIndex);
    expect(listenIndex).toBeGreaterThan(startIndex);
    expect(callIndex).toBeLessThan(listenIndex);
  });
});
