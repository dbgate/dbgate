async function run() {
  console.log('Waiting for starting containers...');
  await new Promise(resolve => setTimeout(resolve, 20000));
}

run();
