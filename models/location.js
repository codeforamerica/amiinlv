var async    = require( "async" )
var Geocoder = require( "./geocoder" )
var Limits   = require( "./limits" )

var Location = function ( ) {
}

Location.prototype = {

  toJSON: function () {
    return {
      latitude:     this.latitude,
      longitude:    this.longitude,
      withinLimits: this.withinLimits
    }
  },

  // private
  _setWithinLimits: function ( callback ) {
    var self = this
    Limits.includesLocation( this, function ( result ) {
      self.withinLimits = result
      callback()
    })
  },

  _setCoordinates: function ( callback ) {
    var self = this
    Geocoder.geocode(this.address, function ( result ) {
      self.latitude  = result.latitude
      self.longitude = result.longitude
      callback()
    })
  }

} 

Location.geocode = function ( address, callback ) {
  var location = new Location()

  location.address = address

  async.series([

    function ( cb ) {
      location._setCoordinates( cb )
    },

    function ( cb ) {
      location._setWithinLimits( cb )
    },

    function ( err ) {
      callback( location )
    }
  ])

}

Location.check = function ( latitude, longitude, callback ) {
  var location = new Location()

  location.latitude  = latitude
  location.longitude = longitude

  async.series([

    function ( cb ) {
      location._setWithinLimits( cb )
    },

    function ( err ) {
      callback( location )
    }

  ])

}

module.exports = Location
