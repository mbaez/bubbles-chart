function UiBuilder(config) {
    this.config = config;
}

UiBuilder.prototype = new BubbleEvents();
UiBuilder.prototype.constructor = UiBuilder;



/**
 * Create the visualization and timeline container 
 */
UiBuilder.prototype.prepareContainer = function () {
    this.diameter = $(this.config.container).height();
    this.width = $(this.config.container).width() - this.config.padding;

    this.diameter = this.diameter < 500 ? 500 : this.diameter;
    this.config.scope = this.config.container.replace("#", "");
    this.vizId = this.config.scope + "-viz";
    this.footerId = this.config.scope + "-footer";
    var $viz = $("<div />");
    $viz.attr("id", this.vizId);

    var $footer = $("<div />");
    $footer.attr("id", this.footerId);

    $(this.config.container).append($viz);
    $(this.config.container).append($footer);
    d3.select(self.frameElement).style("height", this.diameter + "px");
}


/**
 * Build a svg text node.
 */
UiBuilder.prototype.text = function (node, options) {

    function isLikeWhite(c) {
        var dc = 235;
        var rgb = d3.rgb(c);
        return rgb.r >= dc && rgb.g >= dc && rgb.b >= dc;
    }

    var thiz = this;
    return node.append("text")
        .attr("class", "wrap")
        .style("fill", function (d) {
            var c = thiz.config.color(d[thiz.config.label]);
            c = d3plus.color.text(c);
            if (isLikeWhite(c)) {
                return thiz.config.defaultColor;
            }
            return c;
        })
        .text(function (d) {
            return thiz.config.format.text(d[thiz.config.label]);
        });
}

/**
 * Build a svg circle node.
 */
UiBuilder.prototype.circle = function (node, options) {
    var thiz = this;
    options = typeof options == "undefined" ? {} : options;
    options.offset = typeof options.offset == "undefined" ? 0 : options.offset;
    options.class = typeof options.class == "undefined" ? "shape" : options.class;

    return node.append("circle")
        .attr("r", function (d) {
            if (d.r < options.offset) {
                return 0;
            }
            return d.r - options.offset;
        })
        .attr("class", options.class)
        .style("fill", function (d) {
            if (typeof options.fill != "undefined") {
                return options.fill;
            }
            return thiz.config.color(d[thiz.config.label]);
        });
}


/**
 * This methdod build the tooltip.
 */
UiBuilder.prototype.createTooltip = function (el, d) {
    var thiz = this;
    var data = [{
        "value": d[thiz.config.size],
        "name": thiz.config.size
    }];

    if (this.config.percentage) {
        data.push({
            "value": this.config.percentage(d) * 100,
            "name": "Percentage"
        });
    }

    data = this.config.tooltip ? this.config.tooltip(d) : data;
    //se formatean los datos
    for (var i = 0; i < data.length; i++) {
        data[i].name = thiz.config.format.text(data[i].name);
        if (isNaN(data[i].value)) {
            data[i].value = thiz.config.format.text(data[i].value);
        } else {
            data[i].value = thiz.config.format.number(data[i].value);
        }
    }
    var elP = $(el).position();
    var svgP = $("#" + this.vizId).position();
    var $el = d3.select(el);
    var bbox = $el.node().getBBox();
    var elT = d3.transform($el.attr("transform")).translate;
    //se calcula el tamaño del tooltip
    var maxWidth = 300;
    var maxHeigth = 15 + 35 * data.length;
    //20 px correspondientes a la fecha del tooltip
    var toffset = 20;
    var x = elP.left + bbox.width / 2 - maxWidth / 2;
    var y = elP.top - maxHeigth - toffset;
    x = x < 0 ? 0 : x;
    y = x < 0 ? 0 : y;

    var config = {
        "id": thiz.config.scope + "_visualization_focus",
        "x": x,
        "y": y,
        "allColors": true,
        "fixed": true,
        "size": "small",
        "color": thiz.config.color(d[thiz.config.label]),
        "fontfamily": "Helvetica Neue",
        "fontweight": 200,
        "fontsize": "15px",
        "data": data,
        "width": maxWidth,
        "max_width": maxWidth,
        "mouseevents": false,
        "arrow": true,
        "align": "bottom center",
        "anchor": "top left",
        "title": thiz.config.format.text(d[thiz.config.label]),
    }
    d3plus.tooltip.create(config);
}

/**
 * Wrapping the text using D3plus text warpping. D3plus automatically
 * detects if there is a <rect> or <circle> element placed directly
 * before the <text> container element in DOM, and uses that element's
 * shape and dimensions to wrap the text.
 */
UiBuilder.prototype.wrapText = function () {

    $("#" + this.vizId).find(".wrap")
        .each(function () {
            d3plus.textwrap()
                .container(d3.select(this))
                .resize(true)
                .align("middle")
                .valign("middle")
                .draw();
        })
}


/**
 * buil a breadcrumbs
 */
UiBuilder.prototype.breadcrumbs = function () {
    var $ul = $("<ul class='bubble-hierarchies'/>");
    var $liTmpl = $("<li / >");
    var $aTmpl = $("<a class='bubble-levels disable'/>");
    for (var i = 0; i < this.config.levels.length; i++) {
        var $li = $liTmpl.clone();
        var aId = "bubble-li-lvl-" + i;
        var $a = $aTmpl.clone();
        $a.attr("data-level", i);
        $a.attr("id", aId);
        $a.attr("data-name", this.config.levels[i]);
        $a.text(this.config.levels[i]);
        $li.append($a);
        $ul.append($li);
    }
    // leyenda del breadcrumbs
    var $ol = $("<ol class='bubble-breadcrumbs' />");
    //se añade los elementos
    $(this.config.container).prepend($ol);
    $(this.config.container).prepend($ul);

    var thiz = this;
    /* $ul.find("li").on("click", function () {
         if (!$(this).find("a").hasClass("disable")) {
             thiz.onDrillUp($(this));
         }
     });*/
}


UiBuilder.prototype.drillup = function () {
    var level = this.config.level;
    var $labels = $(this.config.container).find(".bubble-breadcrumbs");
    var $brumbs = $(this.config.container).find(".bubble-hierarchies");
    var len = $brumbs.find("[data-level]").length;
    for (var i = level; i < len; i++) {
        $labels.find("[data-level='" + i + "']").remove();
        var $aEl = $brumbs.find("[data-level='" + i + "']");
        var aId = $aEl.attr("id");
        $aEl.addClass("disable");
        $("." + aId).remove();
    }
}

/**
 *
 */
UiBuilder.prototype.updateBreadcrumbs = function (d) {
    //var $target = this.getEl(data);
    var fill = this.config.color(d[this.config.label]);
    var textColor = d3plus.color.text(fill);
    var $brumbs = $(this.config.container).find(".bubble-hierarchies");
    var $a = $brumbs.find("[data-level='" + this.config.level + "']");
    var aId = $a.attr("id");
    $a.removeClass("disable");
    //se aplican los estilos al breadcrums
    var aStyle = "<style class='{id}'>";
    aStyle += "a#{id}::before {border-color: {fill} {fill} {fill} transparent;}";
    aStyle += "li:last-child a#{id}::after {border-color: {fill} {fill} {fill} {fill};}";
    aStyle += "li a#{id}::after {border-left: 1em solid {fill};}";
    aStyle += "a#{id}{background-color: {fill}; color:{text}}";
    aStyle += "li:first-child a#{id}::before{border-color: {fill} {fill} {fill} {fill};}";
    aStyle += "</style>";
    aStyle = aStyle.replace(/{id}/g, aId).replace(/{fill}/g, fill).replace(/{text}/g, textColor);
    $a.append($(aStyle));

    var $labels = $(this.config.container).find(".bubble-breadcrumbs");
    var $li = $("<li/ >");
    $li.attr("data-level", this.config.level);
    var $span = $("<span class='text'/>");
    var $div = $("<div class='note'/>");
    $span.text(this.config.format.text(d[this.config.label]));
    $div.text(this.config.format.number(d[this.config.size]));
    $li.append($span);
    //TODO se desabilita los totales ya que falta implementar el filtrado por año.
    //$li.append($("<br/>"));
    //$li.append($div);
    $labels.append($li);
}