const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');
const routes = require("./routes/routes.js");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

routes(app);

const server = app.listen(process.env.PORT || 3000, 
  () => console.log("Server is running..."));
