var GOOGLE_MAPS_URL = "http://maps.googleapis.com/maps/api/geocode/json";

var geocode = function (address, callback) {
  var params = {
    address: address,
    sensor:  false
  }

  var url = GOOGLE_MAPS_URL + "?" + $.param(params);

  $.ajax(url, { success: callback });
}

module.exports = geocode;
