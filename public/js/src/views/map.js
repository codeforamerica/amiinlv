window.App.Views.Map = Backbone.View.extend({

  el: "#map",

  initialize: function () {
    cartodb.createVis(this.$el, App.Config.mapURL, {
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
    this._setLocation(this._currentUserLocation());
    return false;
  },

  reset: function () {
    this._setLocation(this._defaultLocation());
    return false;
  },

  _setLocation: function (newLocation) {
    this.map.setView(newLocation, App.Config.map.finalZoom);
    return false;
  },

  _defaultLocation: function () {
    return new L.LatLng(App.Config.map.latitude, App.Config.map.longitude);
  },

  _currentUserLocation: function () {
    return new L.LatLng(userLocation.get("latitude"), userLocation.get("longitude"));
  }

});
