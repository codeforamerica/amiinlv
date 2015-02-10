var PORT = 3000
var express = require('express')
var sass = require('node-sass-middleware')
var config = require(__dirname + '/config.js')

var app = express()

app.set('view engine', 'ejs')
app.set('views', __dirname + '/app/views')
app.set('port', process.env.PORT || PORT)

app.use(sass({
  src: __dirname + '/src',
  dest: __dirname + '/public',
  debug: true,
  outputStyle: 'compressed'
}))

app.use(express.static(__dirname + '/public'))

app.get('/', function (req, res) {
  res.render('index', config)
})

app.listen(app.get('port'), function () {
  console.log('Listening on port ' + app.get('port'))
})
