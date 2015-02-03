var PORT = 3000
var express = require('express')
var path = require('path')
var app = express()

app.set('port', process.env.PORT || PORT)
app.use(express.static('public'))

app.listen(app.get('port'), function () {
  console.log( 'Listening on port ' + app.get('port') )
})
