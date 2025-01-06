/*
 * Copyright 2018 Stocard GmbH.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');
const debug = require('debug');

// interface Options {
//   username?: string;
//   password?: string;
//   privateKey?: string | Buffer;
//   agentForward?: boolean;
//   bastionHost?: string;
//   passphrase?: string;
//   endPort?: number;
//   endHost: string;
//   agentSocket?: string;
//   skipAutoPrivateKey?: boolean;
//   noReadline?: boolean;
// }

// interface ForwardingOptions {
//   fromPort: number;
//   toPort: number;
//   toHost?: string;
// }

class SSHConnection {
  constructor(options) {
    this.options = options;
    this.debug = debug('ssh');
    this.connections = [];
    this.isWindows = process.platform === 'win32';
    if (!options.username) {
      this.options.username = process.env['SSH_USERNAME'] || process.env['USER'];
    }
    if (!options.endPort) {
      this.options.endPort = 22;
    }
    if (!options.privateKey && !options.agentForward && !options.skipAutoPrivateKey) {
      const defaultFilePath = path.join(os.homedir(), '.ssh', 'id_rsa');
      if (fs.existsSync(defaultFilePath)) {
        this.options.privateKey = fs.readFileSync(defaultFilePath);
      }
    }
  }

  async shutdown() {
    this.debug('Shutdown connections');
    for (const connection of this.connections) {
      connection.removeAllListeners();
      connection.end();
    }
    return new Promise(resolve => {
      if (this.server) {
        this.server.close(resolve);
      }
      return resolve();
    });
  }

  async tty() {
    const connection = await this.establish();
    this.debug('Opening tty');
    await this.shell(connection);
  }

  async executeCommand(command) {
    const connection = await this.establish();
    this.debug('Executing command "%s"', command);
    await this.shell(connection, command);
  }

  async shell(connection, command) {
    return new Promise((resolve, reject) => {
      connection.shell((err, stream) => {
        if (err) {
          return reject(err);
        }
        stream
          .on('close', async () => {
            stream.end();
            process.stdin.unpipe(stream);
            process.stdin.destroy();
            connection.end();
            await this.shutdown();
            return resolve();
          })
          .stderr.on('data', data => {
            return reject(data);
          });
        stream.pipe(process.stdout);

        if (command) {
          stream.end(`${command}\nexit\n`);
        } else {
          process.stdin.pipe(stream);
        }
      });
    });
  }

  async establish() {
    let connection;
    if (this.options.bastionHost) {
      connection = await this.connectViaBastion(this.options.bastionHost);
    } else {
      connection = await this.connect(this.options.endHost);
    }
    return connection;
  }

  async connectViaBastion(bastionHost) {
    this.debug('Connecting to bastion host "%s"', bastionHost);
    const connectionToBastion = await this.connect(bastionHost);
    return new Promise((resolve, reject) => {
      connectionToBastion.forwardOut(
        this.options.bindHost,
        22,
        this.options.endHost,
        this.options.endPort || 22,
        async (err, stream) => {
          if (err) {
            return reject(err);
          }
          const connection = await this.connect(this.options.endHost, stream);
          return resolve(connection);
        }
      );
    });
  }

  async connect(host, stream) {
    const { Client } = require('ssh2');
    this.debug('Connecting to "%s"', host);
    const connection = new Client();
    return new Promise(async (resolve, reject) => {
      const options = {
        host,
        port: this.options.endPort,
        username: this.options.username,
        password: this.options.password,
        privateKey: this.options.privateKey,
      };
      if (this.options.agentForward) {
        options['agentForward'] = true;

        // see https://github.com/mscdex/ssh2#client for agents on Windows
        // guaranteed to give the ssh agent sock if the agent is running (posix)
        let agentDefault = process.env['SSH_AUTH_SOCK'];
        if (this.isWindows) {
          // null or undefined
          if (agentDefault == null) {
            agentDefault = 'pageant';
          }
        }

        const agentSock = this.options.agentSocket ? this.options.agentSocket : agentDefault;
        if (agentSock == null) {
          throw new Error('SSH Agent Socket is not provided, or is not set in the SSH_AUTH_SOCK env variable');
        }
        options['agent'] = agentSock;
      }
      if (stream) {
        options['sock'] = stream;
      }
      // PPK private keys can be encrypted, but won't contain the word 'encrypted'
      // in fact they always contain a `encryption` header, so we can't do a simple check
      options['passphrase'] = this.options.passphrase;
      const looksEncrypted = this.options.privateKey
        ? this.options.privateKey.toString().toLowerCase().includes('encrypted')
        : false;
      if (looksEncrypted && !options['passphrase'] && !this.options.noReadline) {
        // options['passphrase'] = await this.getPassphrase();
      }
      connection.on('ready', () => {
        this.connections.push(connection);
        return resolve(connection);
      });

      connection.on('error', error => {
        reject(error);
      });
      try {
        connection.connect(options);
      } catch (error) {
        reject(error);
      }
    });
  }

  //   private async getPassphrase() {
  //     return new Promise(resolve => {
  //       const rl = readline.createInterface({
  //         input: process.stdin,
  //         output: process.stdout,
  //       });
  //       rl.question('Please type in the passphrase for your private key: ', answer => {
  //         return resolve(answer);
  //       });
  //     });
  //   }

  async forward(options) {
    const connection = await this.establish();
    return new Promise((resolve, reject) => {
      this.server = net
        .createServer(socket => {
          this.debug(
            'Forwarding connection from "localhost:%d" to "%s:%d"',
            options.fromPort,
            options.toHost,
            options.toPort
          );
          connection.forwardOut(
            this.options.bindHost,
            options.fromPort,
            options.toHost || this.options.bindHost,
            options.toPort,
            (error, stream) => {
              if (error) {
                return reject(error);
              }
              socket.pipe(stream);
              stream.pipe(socket);
            }
          );
        })
        .listen(options.fromPort, this.options.bindHost, () => {
          return resolve();
        });
    });
  }
}

module.exports = { SSHConnection };
