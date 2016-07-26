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

    console.log(this.width);
    var $viz = $("#" + this.vizId);
    $viz.width(this.width);

    this.center = {
        x: this.width / 2,
        y: this.diameter / 2
    };
    this.damper = 0.1;
    this.layoutGravity = -0.01;
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

    this.filterCenters = {};
    var cols = 4;
    var xpadding = 100;
    var ypadding = 50;
    for (var attr in this.filters) {
        this.filterCenters[attr] = {};
        var len = this.filters[attr].length;
        var nrows = Math.round(len / cols);
        var dx = (this.width - xpadding) / cols;
        var dy = (this.diameter - ypadding) / nrows;
        var idx = 1;
        var p = 0.3;
        for (var i = 0; i < len; i++) {
            var strTmp = this.filters[attr][i];
            // se calcula la y
            var row = Math.round(i / cols);
            var y = dy * (row + 1);
            //y = row == 0 ? dy * (1 - p) : y;
            y = row == nrows ? y - dy * p : y;
            //se calcula la x
            idx = idx > cols ? 1 : idx;
            var x = dx * idx;
            x = idx == 1 ? dx * (1 - p) : x;
            x = idx == cols ? x - dx * p : x;
            idx += 1;
            this.filterCenters[attr][strTmp] = {
                x: x,
                y: y,
                dx: dx,
                dy: dy
            }
        }
    }
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
        .selectAll(".filers")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "filers")
        .attr("x", function (d) {
            var dt = thiz.filterCenters[attr][d];
            return dt.x - dt.dx * 0.3;
        }).attr("y", function (d) {
            var dt = thiz.filterCenters[attr][d];
            return dt.y;
        })
        .attr("text-anchor", "middle")
        .text(function (d) {
            return d;
        });
};

MotionBubble.prototype.hide_years = function () {
    var years;
    return years = this.vis.selectAll(".years").remove();
};
