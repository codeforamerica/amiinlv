var CartoDB  = require("cartodb")
var Limits   = { }

var USER  = "cfa"
var TABLE = "clv_boundary"
var QUERY = "SELECT ST_Intersects(ST_GeometryFromText('POINT({lng} {lat})', 4326), the_geom) FROM {table};"

Limits.includesLocation = function ( location, callback ) {
  var client = new CartoDB({ user: USER })
  var params = {
    lat:   location.latitude,
    lng:   location.longitude,
    table: TABLE
  }

  var done = function (err, data) {
   var result = false;
    if (data.rows && data.rows.length > 0) {
      result = data.rows[0].st_intersects;
    }
    callback(result)
  }

  client.query(QUERY, params, done)
}

module.exports = Limits
