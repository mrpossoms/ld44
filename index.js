var express = require('express');
var app = express();

app.use(express.static('static'));

app.get('/', function(req, res){
	res.sendFile('index.html');
});

var server = app.listen(process.env.PORT ? process.env.PORT : 3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('App listening at http://%s:%s', host, port);
});
