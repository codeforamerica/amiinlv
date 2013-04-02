var config = require("../config");
var MAP_ATTRIBUTION = "©2012 Nokia <a href=\"http://here.net/services/terms\">Terms of Use</a>"

var TILE_LAYER_URL  = "https://maps.nlp.nokia.com/maptiler/v2/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?lg=eng&token=61YWYROufLu_f8ylE0vn0Q&app_id=qIWDkliFCtLntLma2e6O"

var REGION_LAYER_STYLE ={
  color: "#F11",
  weight: 5,
  opacity: 0.1
}

var Map = function (json) {
  this.json = json;

  this.map = L.map("map", {
    dragging: false,
    touchZoom: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    zoomControl: false
  });

  this.markers = [];
}

Map.prototype.render = function () {
  L.tileLayer(TILE_LAYER_URL, {
    attribution: MAP_ATTRIBUTION,
    maxZoom: 23
  }).addTo(this.map);

  L.geoJson(this.json, {
    style: REGION_LAYER_STYLE
  }).addTo(this.map);

  this.reset();
}

Map.prototype.reset = function () {
  this.removeMarkers();
  this.setLocation(config.latitude, config.longitude, config.initialZoom);
}

Map.prototype.setLocation = function (lat, lng, zoom) {
  this.map.setView([lat, lng], zoom);
  return true;
}

Map.prototype.createMarker = function (lat, lng) {
  var marker = L.marker([lat, lng]).addTo(this.map);
  this.markers.push(marker);
  return true;
}

Map.prototype.removeMarkers = function () {
  for (var i = 0; i < this.markers.length; i++) {
    this.map.removeLayer(this.markers[i]);
  };
  return true;
}

module.exports = Map;
