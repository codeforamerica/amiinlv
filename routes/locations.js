var Location = require( "../models/location" )

exports.geocode = function ( req, res ) {

  var address = req.query.address

  if (address) {
    Location.geocode( address, function ( location ) {
      res.json( location.toJSON() )
    })
  } else { 
    console.log("Address must not be nil")
  }

}

exports.check = function ( req, res ) {
  var latitude  = req.query.latitude,
      longitude = req.query.longitude

  if (latitude && longitude) {
    Location.check( latitude, longitude, function ( location ) {
      res.json( location.toJSON() )
    })
  } else {
    console.log("Latitude and Longitude must not be nil")
  }
}
