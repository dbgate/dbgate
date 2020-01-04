const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const cors = require('cors');
const io = require('socket.io');

const useController = require('./utility/useController');
const connections = require('./controllers/connections');
const socket = require('./utility/socket');

const app = express();

const server = http.createServer(app);
socket.set(io(server));

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('DbGate API');
});

useController(app, '/connections', connections);

server.listen(3000);
