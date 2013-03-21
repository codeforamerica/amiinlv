class App.Models.Location extends Backbone.Model

  defaults:
    latitude:     36.18
    longitude:    -114.14
    withinLimits: true

  initialize: () ->
    @on "change", @onChange

  url: () ->
    @instanceURL

  fetchByAddress: (address) ->
    @instanceURL = "/geocode"
    @fetch
      data:
        address: address

  fetchByCurrentLocation: (position) ->
    @instanceURL = "/check"
    @fetch
      data:
        latitude:  position.coords.latitude
        longitude: position.coords.longitude

  getCurrentLocation: () ->
    geolocator = window.navigator.geolocation

    if (geolocator)
      geolocator.getCurrentPosition(
        _.bind(@fetchByCurrentLocation, @),
        _.bind(@onGetCurrentLocationFailure, @)
      )
    else
      console.log("Browser does not support geolocation")

  onGetCurrentLocationFailure: (error) ->
    @trigger "currentlocation:failure"

  onChange: () ->
    if @get("withinLimits")
      @trigger "location:withinlimits"
    else
      @trigger "location:outsidelimits"

  reset: () ->
    @set(@defaults)
