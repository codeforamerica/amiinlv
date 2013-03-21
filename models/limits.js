var request  = require( "request" )
var Limits   = { }

var ENDPOINT = "http://cfa.cartodb.com/api/v2/sql"
var TABLE    = "clv_boundary"

var uri = function (table, lat, lng) {
  return ENDPOINT + "?q=SELECT%20ST_Intersects(ST_GeometryFromText('POINT("+lng+"%20"+lat+"%20)',%204326),%20%22the_geom%22)%20FROM%20"+table+";"
}

Limits.includesLocation = function ( location, callback ) {
  var query = uri( TABLE, location.latitude, location.longitude )
  var result = false

  request(query, function ( err, res, body ) {
    if ( body ) body = JSON.parse( body )

    if ( body.rows && body.rows.length > 0) {
      result = body.rows[0].st_intersects  
    }

    callback( result )
  })
}

module.exports = Limits
