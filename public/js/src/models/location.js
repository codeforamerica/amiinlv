window.App.Models.Location = Backbone.Model.extend({

  defaults: {
    latitude:     App.Config.initialLatitude,
    longitude:    App.Config.initialLongitude,
    withinLimits: true
  },

  initialize: function () {
    return this.on("change", this._onChange, this);
  },

  url: function () {
    return this.instanceURL;
  },

  reset: function () {
    this.set(this.defaults);
    return this;
  },

  fetchByAddress: function (address) {
    this.instanceURL =  "/geocode";

    this.fetch({
      data: {
        address: address
      }
    });

    return this;
  },

  fetchByCurrentLocation: function (position) {
    this.instanceURL = "/check";

    this.fetch({
      data: {
        latitude:  position.coords.latitude,
        longitude: position.coords.longitude
      }
    });

    return this;
  },

  getCurrentLocation: function () {
    var geolocator = window.navigator.geolocation;

    if (geolocator) {
      var success = _.bind(this.fetchByCurrentLocation, this),
          failure = _.bind(this._onGetCurrentLocationFailure, this);
      geolocator.getCurrentPosition(success, failure);
    } else {
      // TODO: do something meaningful here 
      console.log("Browser does not support geolocation");
    }

    return this;
  },

  // private

  _onGetCurrentLocationFailure: function () {
    // TODO: do something meaningful here
  },

  _onChange: function () {
    if (this.get("withinLimits")) {
      this.trigger("location:withinlimits");
    } else {
      this.trigger("location:outsidelimits");
    }
    return false;
  }

});
