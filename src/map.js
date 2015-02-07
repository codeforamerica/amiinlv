var config = require('../config')
var MAP_ATTRIBUTION = 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, under <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>. Data by <a href="http://openstreetmap.org">OpenStreetMap</a>, under <a href="http://www.openstreetmap.org/copyright">ODbL</a>.'
var TILE_LAYER_URL = 'http://tile.stamen.com/toner/{z}/{x}/{y}.png'



var REGION_LAYER_STYLE ={
  color: '#f11',
  weight: 5,
  opacity: 0.1
}

var Map = function (json) {
  this.json = json

  this.map = L.map('map', {
    dragging: false,
    touchZoom: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    closePopupOnClick: false,
    keyboard: false,
    zoomControl: false
  })

  this.markers = []
}

var markerIcon = L.icon({
  iconUrl: '../img/marker.svg',
  shadowUrl: '../img/marker_shadow.png',

  iconSize:     [36, 43], // size of the icon
  shadowSize:   [100, 50],
  iconAnchor:   [18, 43], // point of the icon which will correspond to marker's location
  shadowAnchor: [40, 44],
  popupAnchor:  [0, -50] // point from which the popup should open relative to the iconAnchor
})

Map.prototype.render = function () {
  L.tileLayer(TILE_LAYER_URL, {
    attribution: MAP_ATTRIBUTION,
    maxZoom: 23
  }).addTo(this.map)

  L.geoJson(this.json, {
    style: REGION_LAYER_STYLE
  }).addTo(this.map)

  this.reset()
}

Map.prototype.reset = function () {
  this.removeMarkers()
  this.setLocation(config.latitude, config.longitude, config.initialZoom)
  this.map.closePopup()
  this.map.dragging.disable()
}

Map.prototype.setLocation = function (lat, lng, zoom) {
  this.map.setView([lat, lng], zoom)
  this.map.dragging.enable()
  return true
}

Map.prototype.createMarker = function (lat, lng) {
  var marker = L.marker([lat, lng], {
    icon: markerIcon,
    clickable: false
  }).addTo(this.map)
  this.markers.push(marker)
  return true
}

Map.prototype.createPopup = function (lat, lng, answer, detail) {
  var popup = L.popup({
    autoPan: true,
    closeButton: false,
    autoPanPadding: [10,10]
  })
  .setLatLng([lat, lng])
  .setContent('<a id="answer-back" href="/"></a><h1>' + answer + '</h1><p>' + detail + '</p>')
  .openOn(this.map)
//  $('#answer-back').on('click', reset);
}

Map.prototype.removeMarkers = function () {
  for (var i = 0; i < this.markers.length; i++) {
    this.map.removeLayer(this.markers[i])
  }
  return true
}

module.exports = Map
