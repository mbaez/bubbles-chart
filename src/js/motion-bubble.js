/**
 * Montion Bubble graph
 */
function MotionBubble(config) {
    UiBuilder.call(this, config);
    this.rscale = 0;
    this.damper = 0.15;
    this.layoutGravity = -0.01;
    if (config) {
        this.initialize();
    }
}

MotionBubble.prototype = new UiBuilder();
MotionBubble.prototype.constructor = MotionBubble;

/**
 * Se ecnarga de preparar los contenedores donde se renderizarán
 * Los componentes.
 */
MotionBubble.prototype.prepareContainer = function () {
    UiBuilder.prototype.prepareContainer.call(this);
    var $viz = $("#" + this.vizId);
    $viz.width(this.width);

    this.center = {
        x: this.width / 2,
        y: this.diameter / 2
    };
}

/**
 * Se encarga de construir los filtros de la parte superior
 */
MotionBubble.prototype.buildFilter = function () {
    var filters = [];
    if (this.config.filters.length > 0) {
        filters.push({
            text: "Todos",
            value: "all"
        });
        filters = filters.concat(this.config.filters);
    }
    var container = this.headerId;
    var $footer = $("#" + container);
    var $toogle = $("<div></div>");
    $toogle.addClass("bubble-toogle");
    $toogle.attr("id", container + "-toogle");
    $footer.append($toogle);
    var thiz = this;
    var toggle = d3plus.form()
        .data(filters)
        .container("#" + container + "-toogle")
        .id("value")
        .text("text")
        .type("toggle")
        .draw();

    $footer.find(".d3plus_toggle").on("click", function (d) {
        var $target = $(this)[0];
        var data = $target["__data__"];
        if (typeof data != "undefined") {
            if (data.value !== "all") {
                thiz.groupAll(thiz.circles, data.value);
            } else {
                thiz.groupAll(thiz.circles);
            }
        }
    });
}

MotionBubble.prototype.getMaxRadius = function (attr) {
    var max = null;
    for (var key in this.filtersData[attr]) {
        var d = this.filtersData[attr][key];
        max = max == null || max < d.r ? d.r : max;
    }
    return max;
}

/**
 * Se encarga de calcular el centro de los filtros
 */
MotionBubble.prototype.calculateFilterCenter = function () {
    this.filterCenters = {};
    var $viz = $("#" + this.vizId);
    var cols = this.config.cols;
    var p = this.config.p;
    var xpadding = 80;
    var ypadding = 100;
    var newH = this.diameter;
    var pos = $viz.position()
    for (var attr in this.filters) {
        this.filterCenters[attr] = {};
        var len = this.filters[attr].length;
        cols = this.config.cols;
        cols = len < cols ? len : cols;
        var nrows = parseInt(len / cols);
        nrows = nrows == 1 ? 2 : nrows;
        var dx = (this.width - xpadding * 2) / cols;
        var dy = (this.diameter - ypadding) / nrows;
        var idx = 1;
        var y0 = pos.top + ypadding / 2;
        var x0 = pos.left + xpadding / 2;
        var maxR = 0;
        for (var i = 0; i < len; i++) {
            var strTmp = this.filters[attr][i];
            var fdata = this.filtersData[attr][strTmp];
            fdata.r = Math.sqrt(fdata.r);
            if (idx > cols) {
                idx = 1;
                y0 += dy + maxR;
                maxR = 0;
            }
            // se calcula la y
            maxR = maxR < fdata.r ? fdata.r : maxR;
            var row = parseInt(i / cols);
            var y = y0 + dy;
            y += 25;
            //se calcula la x
            var x = dx * idx;
            x = x - fdata.r * 0.3;
            //se actualiza el heigth
            newH = y;
            this.filterCenters[attr][strTmp] = {
                x: x,
                y: y,
                r: fdata.r,
                size: fdata.size,
                filter: strTmp
            }
            idx += 1;
        }
    }
    //se redimensiona el container
    var $svg = $viz.find("svg");
    $viz.height(newH + ypadding * 2);
    $svg.height(newH + ypadding * 2);
}


/**
 * Se sobrescribe el método rollup del base builder
 */
MotionBubble.prototype.roolup = function (v, sample) {
    var data = {};
    var thiz = this;
    for (var attr in sample) {
        this.roolupFilters(v, attr);
        for (var i = 0; i < v.length; i++) {
            if (attr == this.config.time) {
                data[attr] = v.map(function (d) {
                    if (thiz.timeArray.indexOf(d[attr]) == -1) {
                        thiz.timeArray.push(d[attr]);
                    }
                    return d[attr];
                });
            } else if (attr == this.config.size) {
                data[attr] = d3.sum(v, function (d) {
                    return d[attr];
                });
            } else {
                data[attr] = v[0][attr];
            }
        }
    }
    return data;
}

/**
 * Se encarga de preprocesar a los datos
 */
MotionBubble.prototype.buildNodes = function (data, filter) {
    var thiz = this;
    UiBuilder.prototype.buildNodes.call(this, data, filter);
    //darray = darray.children;
    var darray = data;

    var max = d3.max(darray, function (d) {
        return d[thiz.config.size];
    });

    var min = d3.min(darray, function (d) {
        return d[thiz.config.size];
    });

    min = min == max ? 0 : min;
    var nChilds = darray.length - 10;
    nChilds = nChilds < 5 ? 5 : nChilds;
    nChilds = nChilds > 30 ? 30 : nChilds;
    var maxR = this.width / nChilds;
    this.rscale = d3.scale.pow()
        .exponent(0.5)
        .domain([min, max])
        .range([this.config.bubble.minRadius, maxR]);

    darray.forEach(function (d) {
        d.x = Math.random() * thiz.width;
        d.y = Math.random() * thiz.diameter;
        d.value = d[thiz.config.size];
        d.r = thiz.rscale(d.value);
        // se sumarizan los radios de los elementos a filtrar
        for (var attr in thiz.filters) {
            thiz.filtersData[attr][d[attr]].r += d.r * d.r;
        };
    });

    darray = darray.sort(function (a, b) {
        return b[thiz.config.size] - a[thiz.config.size];
    });

    this.calculateFilterCenter();
    return darray;
}

/**
 * Graphic builder.
 */
MotionBubble.prototype.builder = function (data) {
    d3.select("#" + this.vizId).html("");
    var svg = d3.select("#" + this.vizId)
        .append("svg")
        .attr("width", this.width)
        .attr("height", this.diameter);
    this.buildFilter();
    var thiz = this;
    this.nodes = this.buildNodes(data);
    this.circles = svg
        .selectAll("circle")
        .data(this.nodes)
        .enter()
        .append("circle")
        .attr("class", "node")
        .attr("r", 0)
        .attr("cx", function (d) {
            return d.x;
        })
        .attr("cy", function (d) {
            return d.y;
        })
        .attr("fill", function (d) {
            return thiz.config.color(d[thiz.config.label]);
        })
        .attr("stroke-width", 1)
        .attr("stroke", function (d) {
            var c = thiz.config.color(d[thiz.config.label]);
            return d3plus.color.legible(c);
        });

    this.bindMouseEvents(this.circles);
    this.circles.transition()
        .duration(2000)
        .attr("r", function (d) {
            return d.r;
        })
    this.start();
    this.groupAll(this.circles);
}

/**
 *
 */
MotionBubble.prototype.charge = function (d) {
    return -Math.pow(d.r, 2.0) / 8;
};

MotionBubble.prototype.start = function () {
    this.force = d3.layout.force()
        .nodes(this.nodes)
        .size([this.width, this.diameter]);
};

MotionBubble.prototype.tickNodes = function (e, moveCallback) {
    var thiz = this;
    this.circles
        .each(moveCallback(e.alpha))
        .attr("cx", function (d) {
            return d.x;
        })
        .attr("cy", function (d) {
            return d.y;
        });
}

MotionBubble.prototype.groupAll = function (nodes, filter) {
    var thiz = this;
    thiz.hideFilters();
    this.force
        .gravity(this.layoutGravity)
        .charge(this.charge)
        .friction(0.9)
        .on("tick", function (e) {
            thiz.tickNodes(e, function (alpha) {
                if (typeof filter != "undefined") {
                    return thiz.moveTowardsFilter(alpha, filter);
                }
                return thiz.moveTowardsCenter(alpha);
            });
        });

    if (typeof filter != "undefined") {
        /*
        Se invoca al metodo que renderiza los labels de los grupos luego de
        1 segundo para darle tiempo a que las burbujas se reposicionen.
        */
        setTimeout(function () {
            thiz.displayFilters(filter);
        }, 1000)
    }
    this.force.start();
};

MotionBubble.prototype.moveTowardsCenter = function (alpha) {
    var thiz = this;
    return function (d) {
        d.x = d.x + (thiz.center.x - d.x) * (thiz.damper) * alpha;
        return d.y = d.y + (thiz.center.y - d.y) * (thiz.damper) * alpha;
    };
};

MotionBubble.prototype.moveTowardsFilter = function (alpha, filter) {
    var thiz = this;
    return function (d) {
        var target = thiz.filterCenters[filter][d[filter]];
        d3.select(this).attr("data-filter", d[filter]);
        d.x = d.x + (target.x - d.x) * thiz.damper * alpha;
        d.y = d.y + (target.y - d.y) * thiz.damper * alpha;
    };
}

/**
 * Se encarga de otener la mayor X e Y de los nodos luego del filtrado
 * para determinar la ubicación de los labels.
 */
MotionBubble.prototype.getLabelXY = function (filter) {

    var xy = {
        x: 0,
        y: 0
    };
    $("#" + this.vizId).find("[data-filter= '" + filter + "']")
        .each(function (e) {
            var cx = parseFloat($(this).attr("cx"));
            var cy = parseFloat($(this).attr("cy"));
            var r = parseFloat($(this).attr("r"));
            xy.x = xy.x == 0 || (cx - r) < xy.x ? cx - r : xy.x;
            xy.y = xy.y == 0 || (cy + r * 2) > xy.y ? cy + r * 2 : xy.y;
        });
    return xy;
}

MotionBubble.prototype.text = function (node, center, filter) {
    var thiz = this;
    var g = node
        .append("g")
        .attr("class", "filters")
        .filter(function (d) {
            return typeof center[d].r != "undefined";
        })
        .attr("transform", function (d) {
            var dt = center[d];
            var pts = thiz.getLabelXY(d);
            pts.x += dt.r;
            pts.y += 25;

            return "translate(" + pts.x + "," + pts.y + ")";
        })
        .attr("text-anchor", "middle");

    var txt = g.append("text")
        .attr("class", "labels")
        .text(function (d) {
            return thiz.config.format.text(d);
        });

    var ntxt = g.append("text")
        .attr("class", "size")
        .text(function (d) {
            var dt = center[d];
            return thiz.config.format.number(dt.size);
        })
        .attr("y", 20);
    return g;
}

MotionBubble.prototype.displayFilters = function (attr) {
    var thiz = this;
    var data = d3.keys(this.filterCenters[attr]);
    var center = thiz.filterCenters[attr];
    var filters = d3.select("#" + this.vizId)
        .select("svg")
        .selectAll(".filters")
        .data(data)
        .enter();
    return thiz.text(filters, center, attr);
};

MotionBubble.prototype.hideFilters = function () {
    d3.select("#" + this.vizId)
        .selectAll(".filters").remove();
};
