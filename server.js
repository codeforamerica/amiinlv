var PORT = 3000

var express   = require("express"),
    path      = require("path"),
    http      = require("http"),
    locations = require("./routes/locations")

var app = express()

app.configure(function () {
  app.set( "port", process.env.PORT || PORT )
  app.use( express.logger("dev") )
  app.use( express.bodyParser() )
  app.use( express.static( path.join( __dirname, "public") ) )
})

app.get( "/geocode", locations.geocode )
app.get( "/check",   locations.check )

http.createServer( app ).listen( app.get("port"), function () {
  console.log( "Listening on port " + app.get("port") )
})
