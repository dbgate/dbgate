#!/usr/bin/env node

var electron = require('electron');

var proc = require('child_process');

var child = proc.spawn(electron, ['.'], { stdio: 'inherit', windowsHide: false });
child.on('close', function (code, signal) {
  if (code === null) {
    console.error(electron, 'exited with signal', signal);
    process.exit(1);
  }
  process.exit(code);
});

const handleTerminationSignal = function (signal) {
  process.on(signal, function signalHandler() {
    if (!child.killed) {
      child.kill(signal);
    }
  });
};

handleTerminationSignal('SIGINT');
handleTerminationSignal('SIGTERM');
