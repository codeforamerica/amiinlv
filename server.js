var PORT = 3000
var express = require('express')
var path = require('path')
var ejs = require('ejs')
var config = require (__dirname + '/config.js')

var app = express()

app.set('port', process.env.PORT || PORT)
app.use(express.static(__dirname + '/public'))

app.set('view engine', 'ejs')
app.set('views', __dirname + '/app/views')

app.get('/', function (req, res) {
  res.render('index', config)
})

app.listen(app.get('port'), function () {
  console.log('Listening on port ' + app.get('port'))
})
