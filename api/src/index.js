const express = require('express');
const  bodyParser = require('body-parser');
const cors = require('cors');
const connection = require('./connection');
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('DbGate API');
});

app.use('/connection', connection);

app.listen(3000);
