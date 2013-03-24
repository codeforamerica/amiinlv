class App.Views.Map extends Backbone.View

  el: "#map"

  origin:
    latitude: 36.18
    longitude: -115.14

  tilesURL: "https://maps.nlp.nokia.com/maptiler/v2/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?lg=eng&token=61YWYROufLu_f8ylE0vn0Q&app_id=qIWDkliFCtLntLma2e6O"

  attribution: "CartoDB <a href='http://cartodb.com/attributions'>attribution</a>, &copy;2012 Nokia <a href='http://here.net/services/terms'>Terms of use</a>"

  zoom: 12
  setZoom: 14

  initialize: () ->
    center = new L.LatLng(@origin.latitude, @origin.longitude)
    mapAttributes =
      center:          center
      zoom:            @zoom
      dragging:        false
      touchZoom:       false
      scrollWheelZoom: false
      doubleClickZoom: false
      boxZoom:         false
      keyboard:        false
      zoomControl:     false

    @map = L.map "map", mapAttributes
 
    tileAttributes =
      attribution: @attribution
      maxZoom:     15
   
    tileLayer = new L.TileLayer @tilesURL, tileAttributes

    @map.addLayer(tileLayer)

    cartoAttributes =
      map:        @map
      user_name:  "cfa"
      table_name: "clv_boundary"
      query:      "SELECT * FROM {{table_name}}"
      tile_style: "\#{{table_name}}{ polygon-fill: #F11; polygon-opacity: 0.1; line-width: 2; line-color: #F99; line-opacity: 1; line-dasharray: 3,4; polygon-comp-op: multiply;}"

    cartoLayer = new L.CartoDBLayer cartoAttributes

    @map.addLayer(cartoLayer)

  refreshLocation: () ->
    latitude  = userLocation.get("latitude")
    longitude = userLocation.get("longitude")
    location  = new L.LatLng( latitude, longitude )
    @map.setView(location, @setZoom)

  resetLocation: () ->
    center  = new L.LatLng( @origin.latitude, @origin.longitude )
    @map.setView(center, @zoom)

  createMap: (data) ->
    tileset = data.layers[0].options.urlTemplate
    center  = new L.LatLng( @origin.latitude, @origin.longitude )

    @map = new L.map "map",

    cartodb.createLayer( @map, @endpoint )
      .done (layer) ->
        ""
      .on "error", (err) ->
        console.log "The following error occurred: " + err
