var client   = require( "geocoder" )
var Geocoder = {}

Geocoder.geocode = function ( address, callback ) {
  client.geocode( address, function ( err, res ) {

    console.log(err)

    if ( res && res.results.length > 0) {
      var result   = res.results[0]
      var location = result.geometry.location

      callback({
        latitude:  location.lat,
        longitude: location.lng
      })
    }

  }) 
}

module.exports = Geocoder
