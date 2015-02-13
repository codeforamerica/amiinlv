var getCurrentLocation = function (success, error) {
  var geolocator = window.navigator.geolocation
  var options = {
    enableHighAccuracy: true,
    maximumAge: 10000
  }

  if (geolocator) {
    // Fixes an infinite loop bug with Safari
    // https://stackoverflow.com/questions/27150465/geolocation-api-in-safari-8-and-7-1-keeps-asking-permission/28436277#28436277
    window.setTimeout(function () {
      geolocator.getCurrentPosition(success, error, options)
    }, 0)
  } else {
    console.log('Browser does not support geolocation')
  }
}

module.exports = getCurrentLocation
