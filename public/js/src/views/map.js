window.App.Views.Map = Backbone.View.extend({

  el: "#map",

  initialize: function () {
    cartodb.createVis(this.$el, App.Config.map.url, {
      center_lat:   App.Config.map.latitude,
      center_lon:   App.Config.map.longitude,
      zoom:         App.Config.map.initialZoom,
      zoomControl:  false,
      cartodb_logo: false
    }).done(
      _.bind(function (vis, layers) { this.map = vis.getNativeMap(); }, this)
    ).error(
      _.bind(function (err) { console.log(err); }, this)
    );
  },

  render: function () {
    this._setLocation(this._currentUserLocation(), App.Config.map.finalZoom);
    return true;
  },

  reset: function () {
    this._setLocation(this._defaultLocation(), App.Config.map.initialZoom);
    return true;
  },

  _setLocation: function (newLocation, zoom) {
    this.map.setView(newLocation, zoom);
    return false;
  },

  _defaultLocation: function () {
    return new L.LatLng(App.Config.map.latitude, App.Config.map.longitude);
  },

  _currentUserLocation: function () {
    return new L.LatLng(userLocation.get("latitude"), userLocation.get("longitude"));
  }

});
