class App.Views.Answer extends Backbone.View

  el:     "#answer"
  marker: "#marker"

  initialize: () ->
    @$marker = $(@marker)

  show: (answer) ->
    @$el.html ich.answer { answer: answer }
    @$marker.css("display", "block")
    @$marker.animate({ opacity: 1, top: "250" }, 250)
    @$el.fadeIn(250)
    $("#input-location").focus()

  hide: () ->
    $(@marker).css("display", "none")

  drop: () ->
    $(@marker).animate({ opacity: 0 }, 0)
