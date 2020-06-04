async function runScript(func) {
  try {
    await func();
    process.exit(0);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
}

module.exports = runScript;
