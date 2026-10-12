// Regression tests for what is written to the server-sent event streams.
//
// /stream needs no authentication, and every event used to be written to every connected stream:
// application log records (with the SQL of every user), query messages, script output, cloud
// login tokens. Connecting with the id of another tab's stream also took that stream over.

const socket = require('./socket');

function fakeResponse() {
  const written = [];
  return {
    written,
    writableEnded: false,
    destroyed: false,
    write(chunk) {
      written.push(chunk);
    },
    events() {
      return written.map(x => x.match(/^event: (.*)\n/)[1]);
    },
  };
}

let tabA, tabB, attacker;
beforeEach(() => {
  for (const strmid of ['tab-a', 'tab-b', 'attacker']) socket.removeSseResponse(strmid);
  tabA = fakeResponse();
  tabB = fakeResponse();
  attacker = fakeResponse();
  socket.addSseResponse(tabA, 'tab-a');
  socket.addSseResponse(tabB, 'tab-b');
  socket.addSseResponse(attacker, 'attacker');
});

describe('events of a session or runner', () => {
  test('go only to the stream of the tab that started it', () => {
    socket.setOwner(socket.sessionOwnerKey('s1'), 'tab-a');
    socket.emitOwned(socket.sessionOwnerKey('s1'), 'session-info-s1', { message: 'select secret' });

    expect(tabA.events()).toEqual(['session-info-s1']);
    expect(tabB.written).toEqual([]);
    expect(attacker.written).toEqual([]);
  });

  test('go to no stream when it was started without a stream id', () => {
    // e.g. a call without the x-dbgate-strmid header
    socket.setOwner(socket.sessionOwnerKey('s-unowned'), undefined);
    socket.emitOwned(socket.sessionOwnerKey('s-unowned'), 'session-info-s-unowned', { message: 'select secret' });

    expect(tabA.written).toEqual([]);
    expect(tabB.written).toEqual([]);
    expect(attacker.written).toEqual([]);
  });

  test('keep data that is not an object, like the exit code of a runner', () => {
    socket.setOwner(socket.runnerOwnerKey('r1'), 'tab-a');
    socket.emitOwned(socket.runnerOwnerKey('r1'), 'runner-done-r1', 0);
    expect(tabA.written[0]).toContain('runner-done-r1');
  });

  test('an id chosen by the client keeps the owner that used it first', () => {
    socket.claimOwner(socket.runnerOwnerKey('client-runid'), 'tab-a');
    socket.claimOwner(socket.runnerOwnerKey('client-runid'), 'attacker');
    socket.emitOwned(socket.runnerOwnerKey('client-runid'), 'runner-progress-client-runid', { progress: 1 });

    expect(tabA.events()).toEqual(['runner-progress-client-runid']);
    expect(attacker.written).toEqual([]);
  });
});

describe('application log records', () => {
  test('go only to streams subscribed through an authorized call', () => {
    socket.subscribeTopic('tab-b', 'applog');
    socket.emitToTopic('applog', 'applog-event', { msg: 'Processing query', sql: 'select secret' });

    expect(tabB.events()).toEqual(['applog-event']);
    expect(tabA.written).toEqual([]);
    expect(attacker.written).toEqual([]);
    socket.unsubscribeTopic('tab-b', 'applog');
  });

  test('the subscription survives a reconnect of the stream', () => {
    socket.subscribeTopic('tab-b', 'applog');
    socket.removeSseResponse('tab-b', tabB);
    const reconnected = fakeResponse();
    socket.addSseResponse(reconnected, 'tab-b');

    socket.emitToTopic('applog', 'applog-event', { msg: 'x' });
    expect(reconnected.events()).toEqual(['applog-event']);
    socket.unsubscribeTopic('tab-b', 'applog');
  });
});

describe('stream ids', () => {
  test('a connected stream is reported as live, so a second connection can be refused', () => {
    expect(socket.hasLiveSseResponse('tab-a')).toBe(true);
    expect(socket.hasLiveSseResponse('unknown')).toBe(false);
  });

  test('a stream whose connection ended is not live', () => {
    tabA.writableEnded = true;
    expect(socket.hasLiveSseResponse('tab-a')).toBe(false);
  });

  test('a refused connection closing does not remove the stream it tried to take over', () => {
    const refused = fakeResponse();
    socket.removeSseResponse('tab-a', refused);
    expect(socket.hasLiveSseResponse('tab-a')).toBe(true);
  });

  test('the stream id of an API call is read from its header', () => {
    expect(socket.getStrmidFromRequest({ headers: { 'x-dbgate-strmid': 'tab-a' } })).toBe('tab-a');
    expect(socket.getStrmidFromRequest({ headers: {} })).toBeUndefined();
    expect(socket.getStrmidFromRequest({ headers: { 'x-dbgate-strmid': 'x'.repeat(101) } })).toBeUndefined();
    expect(socket.getStrmidFromRequest(undefined)).toBeUndefined();
  });
});
