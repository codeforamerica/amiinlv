var getCurrentLocation = function (success, error) {
  var geolocator = window.navigator.geolocation;
  if (geolocator) {
    geolocator.getCurrentPosition(success, error);
  } else {
    alert("Browser does not support geolocation");
  }
}

module.exports = getCurrentLocation;
