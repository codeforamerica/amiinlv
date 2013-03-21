window.App =
  Routers: {}
  Views: {}
  Models: {}
  Collections: {}

# Models
# @codekit-append "./models/location.coffee"

# Views
# @codekit-append "./views/main.coffee"
# @codekit-append "./views/map.coffee"
# @codekit-append "./views/question.coffee"
# @codekit-append "./views/answer.coffee"

jQuery () ->
  if $("#main").length > 0
    window.userLocation = new App.Models.Location()
    window.view         = new App.Views.Main()
