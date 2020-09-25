const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors');
const routes = require("./routes/routes.js");
const sms_routes = require("./routes/sms_routes.js");
const auth = require("./auth.js");
var enforce = require('express-sslify');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(enforce.HTTPS({ trustProtoHeader: true }));

auth.authServer(app);
routes(app);
sms_routes(app);

const server = app.listen(process.env.PORT || 3000, 
  () => console.log("Server is running..."));
