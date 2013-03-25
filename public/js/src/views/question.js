window.App.Views.Question = Backbone.View.extend({

  el: "#question",

  events: {
    "click #input-target" : "_onGetCurrentLocation",
    "click #input-go"     : "_onGo",
    "submit form"         : "_onSubmit"
  },

  hide: function (callback) {
    this.$el.fadeOut(250, callback);
    return false;
  },

  show: function () {
    this.$el.fadeIn(250);
    return false;
  },

  // private

  _onSubmit: function (e) {
    e.preventDefault();
    this._setLocation();
    return false;
  },

  _onGo: function () {
    this._setLocation();
    return false;
  },

  _onGetCurrentLocation: function () {
    userLocation.getCurrentLocation();
    return false;
  },

  _setLocation: function () {
    var address = $("#input-location").val();
    userLocation.fetchByAddress(address);
    return false;
  }

});
