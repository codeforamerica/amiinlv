var PORT    = 3000,
    express = require("express"),
    path    = require("path"),
    app     = express()


app.configure(function () {
  app.set( "port", process.env.PORT || PORT )
  app.use( express.static( path.join( __dirname, "public") ) )
})

app.listen( app.get("port"), function () {
  console.log( "Listening on port " + app.get("port") )
})
