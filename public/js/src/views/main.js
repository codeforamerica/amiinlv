window.App.Views.Main = Backbone.View.extend({

  el: "#main",

  initialize: function () {
    this._setListeners();

    this.map      = new App.Views.Map();
    this.question = new App.Views.Question();
    this.answer   = new App.Views.Answer();

    $("#input-location").focus();

    $(document).bind("keyup", _.bind(this.onKeyUp, this));
  },

  render: function () {
    $("#header").html(ich.header({ name: App.Config.app.name }));
  },

  onWithinLimits: function () {
    this.displayAnswer("yes");
    return false;
  },

  onOutsideLimits: function () {
    this.displayAnswer("no");
    return false;
  },

  displayAnswer: function (answer) {
    this.question.hide(_.bind(function () {
      this.answer.show(answer);
    }, this));

    this.map.render();

    return false;
  },

  onKeyUp: function (e) {
    if (e.keyCode == 27) {
      this.answer.hide();
      this.question.show();
      this.map.reset();
      $("#input-location").focus().select();
    }
  },

  // private

  _setListeners: function () {
    var withinLimits  = _.bind(this.onWithinLimits,  this),
        outsideLimits = _.bind(this.onOutsideLimits, this);

    userLocation.on("location:withinlimits",  withinLimits);
    userLocation.on("location:outsidelimits", outsideLimits);

    return false;
  }

});
