function UiBuilder(config) {
    BaseBuilder.call(this, config);
}

UiBuilder.prototype = new BaseBuilder();
UiBuilder.prototype.constructor = UiBuilder;

/**
 * Initialize visualization builder.
 */
UiBuilder.prototype.initialize = function () {
    this.prepareContainer();
}

/**
 * Se encarga de redimencionar el contenedor de la visualización
 */
UiBuilder.prototype.resizeViz = function (height) {
    var $viz = $("#" + this.vizId);
    var $svg = $viz.find("svg");
    $viz.animate({
        "height": height
    }, 50);
    $svg.animate({
        "height": height
    }, 50);
    //$svg.height(height);
}

UiBuilder.prototype.bindMouseEvents = function (node) {
    var thiz = this;
    node.on('click', function (d) {
            thiz.trigger("click", d);
        })
        .on('mouseenter', function (d) {
            thiz.trigger("mouseenter", d);
        })
        .on('mouseover', function (d) {
            thiz.trigger("mouseover", d);
            d3.select(this).attr("stroke-width", "5px");
            thiz.createTooltip(this, d);
        })
        .on('mouseout', function (d) {
            thiz.trigger("mouseout", d);
            d3.select(this).attr("stroke-width", "1px");
            d3plus.tooltip.remove(thiz.config.scope + "_visualization_focus");
        })
}

/**
 * Create the visualization and timeline container
 */
UiBuilder.prototype.prepareContainer = function () {
    this.diameter = $(this.config.container).height();
    this.width = $(this.config.container).width() - this.config.padding;
    // si el contenedor es muy pequeño se utilizan los valores por defecto
    this.diameter = this.diameter < this.config.height ? this.config.height : this.diameter;
    this.width = this.width < this.config.width ? this.config.width : this.width;

    this.config.scope = this.config.container.replace("#", "");
    this.vizId = this.config.scope + "-viz";
    //construye el div que corrresponde a la leyenda del gráfico.
    this.legendId = this.config.scope + "-legend";
    if (typeof this.config.legendId != "undefined") {
        this.legendId = this.config.legendId;
    }
    //se calcula el id del contenedor de la leyenda que explica los colores.
    this.legendColorId = this.config.scope + "-legend-color";
    if (typeof this.config.legendColorId !== "undefined") {
        this.legendColorId = this.config.legendColorId;
    }
    this.footerId = this.config.scope + "-footer";
    this.headerId = this.config.scope + "-header";
    var ids = [this.headerId, this.vizId, this.legendId, this.legendColorId, this.footerId];
    var clases = ["bubble-header", "bubble-viz", "bubble-legend", "bubble-colors", "bubble-footer"];
    var $divs = {};
    $(this.config.container).addClass("bubble-chart");
    for (var i = 0; i < ids.length; i++) {
        $divs[ids[i]] = $("<div />");
        $divs[ids[i]].attr("id", ids[i]);
        $divs[ids[i]].addClass(clases[i]);
        $(this.config.container).append($divs[ids[i]]);
    }
    $divs[this.vizId].height(this.diameter);
    $divs[this.vizId].width(this.diameter);
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

    var type = typeof options !== "undefined" && typeof options.type !== "undefined" ? options.type : "text";
    var thiz = this;
    return node.append(type)
        .attr("class", "wrap")
        .style("fill", function (d) {
            var c = thiz.config.color(d[thiz.config.colour]);
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
            return thiz.config.color(d[thiz.config.colour]);
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
        "color": thiz.config.color(d[thiz.config.colour]),
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
        "title": thiz.config.format.text(thiz.config.title(d)),
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
    var fill = this.config.color(d[this.config.colour]);
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


/**
 * Tieline change handler
 */
UiBuilder.prototype.onChange = function () {
    var data = $.extend([], this.dataArray, true);
    this.builder(data);
    this.wrapText();
}

/**
 * Build a timeline for the visualization
 */
UiBuilder.prototype.timeline = function () {
    // create lists
    var timeId = this.config.timeContainer == "header" ? this.headerId : this.footerId;
    timeId = "#" + timeId;

    $(timeId).html("");
    var ul = d3.select(timeId)
        .append('ul')
        .attr("class", "timeline")
        .attr('tabindex', 1);

    var thiz = this;
    var time = this.timeArray.sort().map(function (d) {
        var data = {
            "time": d
        };

        if (thiz.timeSelection.length == 0 || thiz.timeSelection.indexOf(d) >= 0) {
            data["_selected"] = true;
        }
        return data;
    });

    var li = ul.selectAll('li')
        .data(time)
        .enter()
        .append('li')
        .attr("class", "entry")
        .classed('selected', function (d) {
            return d._selected;
        })
        .append('a')
        .text(function (d) {
            return d.time;
        });
    d3.selectable(ul, li, function (e) {
        var selections = [];
        ul.selectAll('li')
            .classed('selected', function (d) {
                if (d._selected) {
                    selections.push(d);
                }
                return d._selected;
            })

        //se establecen la selecciones
        thiz.timeSelection = selections.map(function (d) {
            return d.time;
        });
        thiz.onChange();
        thiz.trigger("timechange", thiz.timeSelection);
    });
}
