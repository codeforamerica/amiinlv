window.App.Views.Answer = Backbone.View.extend({

  el: "#answer",

  initialize: function () {
    this.$marker = $("#marker");
  },

  show: function (answer) {
    this.$el.html(ich.answer({
      answer: answer
    }));

    this.$marker.css("display", "block");

    this.$marker.animate({
      opacity: 1,
      top:     "250"
    }, 250);

    this.$el.fadeIn(250);

    return false;
  },

  hide: function () {
    this.$marker.animate({
      opacity: 0,
      top: "0"
    }, 0);
    
    this.$el.fadeOut(150);

    return false;
  }

});
