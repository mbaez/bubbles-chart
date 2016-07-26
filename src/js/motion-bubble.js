/**
 * Montion Bubble graph
 */
function MotionBubble(config) {
    UiBuilder.call(this, config);
    this.rscale = 0;
    if (config) {
        this.initialize();
    }
}

MotionBubble.prototype = new UiBuilder();
MotionBubble.prototype.constructor = MotionBubble;

MotionBubble.prototype.circle = function (node) {}

/**
 *
 */
MotionBubble.prototype.prepareContainer = function () {
    UiBuilder.prototype.prepareContainer.call(this);
    var $viz = $("#" + this.vizId);
    $viz.width(this.width);

    this.center = {
        x: this.width / 2,
        y: this.diameter / 2
    };
    this.damper = 0.1;
    this.layoutGravity = -0.01;
}

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

/**
 * Se encarga de calcular el centro de los filtros
 */
MotionBubble.prototype.calculateFilterCenter = function () {
    this.filterCenters = {};
    var cols = this.config.cols;
    var p = this.config.p;
    var xpadding = 100;
    var ypadding = 50;
    var newH = this.diameter;
    for (var attr in this.filters) {
        this.filterCenters[attr] = {};
        var len = this.filters[attr].length;
        cols = this.config.cols;
        cols = len < cols ? len : cols;
        var nrows = parseInt(len / cols);
        nrows = nrows == 1 ? 2 : nrows;
        var dx = (this.width - xpadding) / cols;
        var dy = (this.diameter - ypadding) / nrows;
        var idx = 1;
        for (var i = 0; i < len; i++) {
            var strTmp = this.filters[attr][i];
            // se calcula la y
            var row = parseInt(i / cols);
            var y = dy * (row + 1);
            y = row == nrows ? y - dy * p : y;
            //se calcula la x
            idx = idx > cols ? 1 : idx;
            var x = dx * idx;
            x = idx == 1 ? dx * (1 - p) : x;
            x = idx == cols ? x - dx * p : x;
            //se actualiza el heigth
            newH = y;
            this.filterCenters[attr][strTmp] = {
                x: x,
                y: y,
                dx: dx,
                dy: dy,
                row: row,
                idx: idx,
                nrows: nrows
            }
            idx += 1;
        }
    }
    //se redimensiona el container
    var $viz = $("#" + this.vizId);
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
        this.displayFilters(filter);
    }
    this.force.start();
};

MotionBubble.prototype.moveTowardsCenter = function (alpha) {
    var thiz = this;
    return function (d) {
        d.x = d.x + (thiz.center.x - d.x) * (thiz.damper + 0.02) * alpha;
        return d.y = d.y + (thiz.center.y - d.y) * (thiz.damper + 0.02) * alpha;
    };
};

MotionBubble.prototype.moveTowardsFilter = function (alpha, filter) {
    var thiz = this;
    return function (d) {
        var target = thiz.filterCenters[filter][d[filter]];
        d.x = d.x + (target.x - d.x) * (thiz.damper + 0.02) * alpha * 1.1;
        return d.y = d.y + (target.y - d.y) * (thiz.damper + 0.02) * alpha * 1.1;
    };
}


MotionBubble.prototype.displayFilters = function (attr) {
    var thiz = this;
    var data = d3.keys(this.filterCenters[attr]);
    var filers = d3.select("#" + this.vizId)
        .select("svg")
        .selectAll(".filters")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "filters")
        .attr("x", function (d) {
            var dt = thiz.filterCenters[attr][d];
            var x = dt.idx == 1 ? dt.dx * 0.5 : dt.x;
            x = dt.idx == thiz.config.cols ? dt.x + dt.dx * 0.3 : x;
            return x;
        }).attr("y", function (d) {
            var dt = thiz.filterCenters[attr][d];
            var y = dt.row == 0 ? dt.dy * 0.5 : dt.y + dt.dy * 0.3;
            y = dt.row == dt.nrows ? dt.y + dt.dy * 0.5 : y;
            return y;
        })
        .attr("text-anchor", "middle")
        .text(function (d) {
            return thiz.config.format.text(d);
        });
};

MotionBubble.prototype.hideFilters = function () {
    d3.select("#" + this.vizId)
        .selectAll(".filters").remove();
};
