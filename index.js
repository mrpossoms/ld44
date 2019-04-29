var express = require('express');
var path = require('path');
var app = express();
var game = require('./server.js');

app.use(express.static(path.join(__dirname, 'static')));

app.get('/', function(req, res){
	res.sendFile('index.html');
});

var http = require('http').Server(app);
game.server(http, 8080);

var server = http.listen(process.env.PORT ? process.env.PORT : 3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('App listening at http://%s:%s', host, port);
});
