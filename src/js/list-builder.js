function ListBuilder(config) {
    UiBuilder.call(this, config);
    this.rscale = 0;
    this.activeFilters = {};
    if (config) {
        var tmp = this.config.xAxis;
        if (typeof this.config.xAxis == "string") {
            this.config.xAxis = {};
            this.config.xAxis.key = tmp;
        }

        this.initialize();
    }
}

ListBuilder.prototype = new UiBuilder();
ListBuilder.prototype.constructor = ListBuilder;

/**
 * Se sobrescribe el método prepare container del padre para modificar
 * el width de la visualización.
 */
ListBuilder.prototype.prepareContainer = function () {
    UiBuilder.prototype.prepareContainer.call(this);
    $("#" + this.vizId).width(this.width);
}

/**
 * Set visualization data.
 * @param{Array} data
 */
ListBuilder.prototype.data = function (data) {
    //UiBuilder.prototype.data.call(this, data);
    this.afterData(data);
    this.pData = this.prepareData(data);
    if (this.config.filters.length > 0) {
        this.buildFilter();
    }
    this.builder(this.pData)
    if (this.config.time) {
        this.timeline();
    }
}

ListBuilder.prototype.buildFilter = function () {
    var thiz = this;
    var filters = [];
    if (this.config.filters.length > 0) {
        filters = filters.concat(this.config.filters);
    }
    var container = this.headerId;
    //for (var filter in this.filters) {
    for (var i = 0; i < filters.length; i++) {
        var filter = filters[i].value;
        var $footer = $("#" + container);
        var $toogle = $("<div></div>");
        var toggleId = container + "-" + filter;
        $toogle.addClass("bubble-toogle");
        $toogle.attr("id", toggleId);
        $footer.append($toogle);

        var selected = true;
        var dataFilters = this.filters[filter].map(function (d) {
            var dmap = {
                text: d,
                value: d,
                attr: filter
            };
            if (selected) {
                dmap.selected = false;
                selected = false;
                thiz.activeFilters[filter] = d;
            }
            return dmap;
        });

        var thiz = this;
        var toggle = d3plus.form()
            .data(dataFilters)
            .container("#" + toggleId)
            .title(filters[i].text)
            .id("value")
            .text("text")
            .type("toggle")
            .draw();
    }
    //bind events
    $footer.find(".d3plus_toggle").on("click", function (d) {
        var $target = $(this)[0];
        var data = $target["__data__"];
        if (typeof data != "undefined") {
            thiz.activeFilters[data.attr] = data.value;
            thiz.builder(thiz.pData);
        }
    });
}

/**
 * Prepare the data for the vizualization
 */
ListBuilder.prototype.roolup = function (v, sample) {
    var data = {};
    for (var attr in sample) {
        this.roolupFilters(v, attr);
    }
    return v;
}

ListBuilder.prototype.prepareData = function (data) {
    var thiz = this;
    this.groups = [];
    var sampleObj;
    var tmp = d3.nest()
        .key(function (d) {
            sampleObj = d;
            if (thiz.groups.indexOf(d[thiz.config.xAxis.key]) < 0) {
                thiz.groups.push(d[thiz.config.xAxis.key]);
            }
            return d[thiz.config.label];
        })
        .rollup(function (d) {
            return thiz.roolup(d, sampleObj);
        })
        .entries(data);

    tmp.max = d3.max(thiz.groups, function (d) {
        return d;
    });

    tmp.min = d3.min(thiz.groups, function (d) {
        return d;
    });

    tmp.map(function (d) {
        d[thiz.config.label] = d.key;
        d[thiz.config.size] = d3.sum(d.values, function (d) {
            return d[thiz.config.size];
        });
        return d;
    });

    this.prepareScale(tmp);
    return tmp;
}


/**
 * Este método se encarga de calcular las escala a utilizar para generar
 * el gráfico. Además se encarga de generar los intervalos de la parte superior
 * del gráfico.
 * @param   {Array} data los datos q
 * @returns {[[Type]]} [[Description]]
 */
ListBuilder.prototype.prepareScale = function (data) {
    var len = this.groups.length;
    this.groups = this.groups.sort(function (a, b) {
        return (a - b);
    });
    var rsize = this.rowSize();
    this.w = rsize * len + this.config.listBubble.textWidth;
    rsize += this.config.listBubble.textWidth;
    var range = [];
    var ri = rsize;
    for (var i = 1; i <= len; i++) {
        range.push(rsize);
        rsize += this.rowSize();
    }
    this.x = d3.scale.ordinal()
        .domain(this.groups)
        .range(range);
    this.xAxis = d3.svg.axis().scale(this.x).orient("top");
    if (typeof this.config.xAxis.format !== "undefined") {
        this.xAxis.tickFormat(this.config.xAxis.format);
    }

    this.xScale = d3.scale.ordinal()
        .domain(this.groups)
        .range(range);

}

ListBuilder.prototype.bindEvents = function (node) {
    var thiz = this;
    node.on('click', function (d) {
            thiz.trigger("click", d);
        })
        .on('mouseenter', function (d) {
            thiz.trigger("mouseenter", d);
        })
        .on('mouseover', function (d) {
            thiz.trigger("mouseover", d);
            thiz.createTooltip(this, d);
            if (this.nodeName == "text") {
                var g = d3.select(this).node().parentNode;
                d3.select(g).selectAll("circle").style("display", "none");
                d3.select(g).selectAll("text.value").style("display", "block");
            }
        })
        .on('mouseout', function (d) {
            thiz.trigger("mouseout", d);
            d3.select(this).attr("stroke-width", "1px");
            d3plus.tooltip.remove(thiz.config.scope + "_visualization_focus");
            if (this.nodeName == "text") {
                var g = d3.select(this).node().parentNode;
                d3.select(g).selectAll("circle").style("display", "block");
                d3.select(g).selectAll("text.value").style("display", "none");
            }
        })
}

ListBuilder.prototype.circle = function (g, data) {
    var thiz = this;
    var rscale = this.scale(data);
    var circles = g
        .selectAll("g")
        .data(data["values"])
        .enter()
        .append("circle")
        .attr("cx", function (d, i) {
            return thiz.xScale(d[thiz.config.xAxis.key]);
        })
        .attr("cy", data.y)
        .attr("r", function (d) {
            return rscale(d[thiz.config.size]);
        })
        .attr("fill", thiz.config.color(data[this.config.colour]));
    this.bindEvents(circles);
    return circles;
}

/**
 * Se encarga de generar el nodo de texto que se encuentra bajo la burbuja que es
 * visible cuando se dispara el evento hover.
 * @param   {d3.element}   g    El nodo al cual pertenecerá el texto.
 * @param   {object}   data el json con los datos del nodo.
 */
ListBuilder.prototype.text = function (g, data) {
    var thiz = this;
    return g
        .selectAll("g")
        .data(data["values"])
        .enter()
        .append("text")
        .attr("y", data.y)
        .attr("x", function (d) {
            return thiz.xScale(d[thiz.config.xAxis.key]);
        })
        .attr("class", "value")
        .text(function (d) {
            return d[thiz.config.size];
        })
        .attr("fill", this.config.color(data[this.config.colour]))
        .style("display", "none");
}

/**
 * Este método se encarga de calcular el tamaño en pixeles que ocupa una burbuja teniendo en cuenta
 * el radio máximo definido y el padding.
 */
ListBuilder.prototype.rowSize = function () {
    return (this.width -this.config.padding* 2 - this.config.listBubble.textWidth )/(this.groups.length +1);

    //return (this.config.listBubble.maxRadius + this.config.listBubble.padding) * 2;
}

/**
 * Se encarga de calcular el tamaño de las burbujas, teniendo en cuenta el rango definido por
 * el máx y min radius.
 */
ListBuilder.prototype.scale = function (data) {
    var thiz = this;
    var max =  this.rowSize() - this.config.listBubble.padding *2;
    max =  max/2;
    return d3.scale.linear()
        .domain([0, d3.max(data['values'], function (d) {
            return d[thiz.config.size];
        })])
        .range([this.config.listBubble.minRadius, max]);
}

/**
 * Se encarga de aplicar los filtros, en el caso que se ecuentren definidos, a los datos
 * de forma local. Se encarga de manejar el evento change filter.
 * @param   {Array} data El conjunto de datos a cual se aplicará el filtrado
 * @returns {Array} El conjunto de datos que cumple con los criterios de filtrado.
 */
ListBuilder.prototype.filtrar = function (data) {
    var thiz = this;
    var result = [];
    for (var i = 0; i < data.length; i++) {
        var tmp = [];
        for (var j = 0; j < data[i].values.length; j++) {
            var d = data[i].values[j];
            var show = true;
            for (filter in thiz.activeFilters) {
                show = show && (d[filter] == thiz.activeFilters[filter]);
            }
            if (show) {
                tmp.push(d);
            }
        }

        if (tmp.length > 0) {
            var d = $.extend({}, data[i], true);
            d.values = tmp;
            for (filter in thiz.activeFilters) {
                d[filter] = thiz.activeFilters[filter];
            }
            result.push(d);
        }
    }
    return result;
}

/**
 * Build the visualization
 */
ListBuilder.prototype.builder = function (data) {
    var index = 0;
    var thiz = this;
    var fData = $.extend([], data, true);
    fData = this.filtrar(fData);
    d3.select("#" + this.vizId).selectAll("svg").remove();
    var svg = d3.select("#" + this.vizId)
        .append("svg")
        .style("width", this.width)
        .attr("height", this.diameter);
    var px = this.rowSize();
    var node = svg.append("g")
        .attr("transform", "translate(" + 0 + "," + (px/2)+ ")");
    //se renderiza
    function getY(d) {
        index += 1;
        d.y = index * thiz.rowSize();
        return d.y;
    }
    node.append("g")
        .attr("class", "x axis")
        .call(this.xAxis);

    var g = svg.selectAll(".node")
        .data(fData)
        .enter()
        .append("g")
        .attr("y", getY)
        .attr("class", "node");

    var text = g.append("text")
        .style("font-size", "14px")
        .attr("x", thiz.config.listBubble.padding )
        .attr("width", this.config.listBubble.textWidth)
        .attr("y", function (d) {
            return d.y;
        })
        .attr("class", "label")
        .text(function (d) {
            thiz.circle(d3.select(this.parentNode), d);
            thiz.text(d3.select(this.parentNode), d);
            return d[thiz.config.label]
        })
        .each(function () {
            var width = thiz.config.listBubble.textWidth;
            var padding = thiz.config.listBubble.padding;
            var self = d3.select(this),
                textLength = self.node().getComputedTextLength(),
                text = self.text();
            while (textLength > (width + 2 * padding) && text.length > 0) {
                text = text.slice(0, -1);
                self.text(text + '...');
                textLength = self.node().getComputedTextLength();
            }
        })
        .style("fill", function (d) {
            return thiz.config.color(d[thiz.config.colour])
        });

    this.bindEvents(text);

    var h = this.rowSize() * fData.length + thiz.config.padding * 3;
    $("#" + this.vizId).height(h);
    svg.attr("height", h);
};
