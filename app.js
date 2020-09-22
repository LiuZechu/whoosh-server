const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');
const routes = require("./routes/routes.js");
const sms_routes = require("./routes/sms_routes.js");
const auth = require("./auth.js");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

auth(app);
routes(app);
sms_routes(app);

const server = app.listen(process.env.PORT || 3000, 
  () => console.log("Server is running..."));
