class App.Views.Question extends Backbone.View

  el:    "#question"
  input: "#input-location"

  events:
    "click #input-target": "onGetLocation"
    "click #input-go":     "onGo"
    "submit form":         "onSubmit"

  onGetLocation: ->
    console.log "get location"
    userLocation.getCurrentLocation()

  onGo: () ->
    @setLocation()
    false

  onSubmit: (e) ->
    e.preventDefault()
    @setLocation()
    false

  setLocation: ->
    address = $(@input).val()
    userLocation.fetchByAddress address

  hide: (callback) ->
    @$el.fadeOut(250, callback)
