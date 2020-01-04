const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const useController = require('./utility/useController');
const connections = require('./controllers/connections');
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('DbGate API');
});

useController(app, '/connections', connections);

app.listen(3000);
