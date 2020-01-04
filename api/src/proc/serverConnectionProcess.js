function handleConnect() {}

const messageHandlers = {
  connect: handleConnect,
};

function handleMessage({ type, ...other }) {
  const handler = messageHandlers[type];
  handler(other);
}

process.on('message', async connection => {
  try {
    const connectFunc = require(`../engines/${connection.engine}/connect`);
    const res = await connectFunc(connection);
    process.send(res);
  } catch (e) {
    process.send({ error: e.message });
  }
});
