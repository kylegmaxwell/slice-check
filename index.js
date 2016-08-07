'use-strict';

var express = require('express');
var app = express();
app.set('port', process.env.PORT || 5000);
app.use('/',express.static('public'));
app.use('/src',express.static('src'));
app.use('/lib',express.static('lib'));
app.use('/data',express.static('data'));
app.use('/node_modules',express.static('node_modules'));
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
