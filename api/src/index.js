const express = require("express");
var cors = require("cors");
const app = express();

app.use(cors());

app.get("/", function(req, res) {
  //  res.json({msg: 'This is CORS-enabled for all origins!'})
   res.send("Hello World");
});

app.listen(3000);
