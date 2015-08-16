var http = require("http"),
express = require("express"),
app = express(),
port = process.env.PORT||3000,
bodyParser = require("body-parser");

app.use(express.static(__dirname + "/client"));
app.use(bodyParser.urlencoded({extended: true}));

http.createServer(app).listen(port);