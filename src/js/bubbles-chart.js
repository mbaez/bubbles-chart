var color = d3plus.color.scale;
var offset = 5;

/**
 */
function BubbleChart(options) {
    this.initialize(options);
}

/**
 *
 */
BubbleChart.prototype.initialize = function (options) {
    this.config = {};
    for (var attr in options) {
        this.config[attr] = options[attr];
    }
}

/**
 *
 */
BubbleChart.prototype.builder = function (data) {
    var thiz = this;
    var format = {
        text: function (text, key) {
            return d3plus.string.title(text);
        },
        number: function (number, data) {
            return d3plus.number.format(number)
        }
    };
    this.config.scope = this.config.container.replace("#", "");
    this.config.format = this.config.format ? this.config.format : {};
    this.config.format = d3plus.object.merge(format, this.config.format);

    var diameter = $(this.config.container).height();
    diameter = diameter < 700 ? 700 : diameter;

    var bubble = d3.layout.pack()
        .sort(null)
        .size([diameter, diameter])
        .padding(1.5);

    var svg = d3.select(this.config.container).append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .attr("class", "bubble");

    var node = svg.selectAll(".node")
        .data(bubble.nodes(this.buildNodes(data))
            .filter(function (d) {
                return !d.children;
            }))
        .enter().append("g")
        .attr("class", "node")
        .on('mouseover', function (d) {
            thiz.createTooltip(d);
        })
        .on('mouseout', function (d) {
            d3plus.tooltip.remove(thiz.config.scope + "_visualization_focus");
        })
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    var gnode = node.append("g");

    gnode.append("circle")
        .attr("class", "shape")
        .attr("r", function (d) {
            return d.r;
        })
        .style("fill", function (d) {
            return color(d.name);
        });

    gnode.append("circle")
        .attr("r", function (d) {
            return d.r - offset;
        })
        .style("fill", function (d) {
            return color(d.name);
        })
        .style("stroke", "#FFF")
        .style("stroke-width", "2px");

    if (this.config.percentage) {
        this.buildGauge(node);
    } else {
        gnode.append("text")
            .attr("class", "wrap")
            .style("fill", function (d) {
                var c = color(d.name);
                return d3plus.color.text(c);
            })
            .text(function (d) {
                return options.format.text(d.name);
            });
    }

    d3.select(self.frameElement).style("height", diameter + "px");
}

/**
 *
 */
BubbleChart.prototype.data = function (data) {
    this.builder(data)
    this.wrapText();
}

/**
 *
 */
BubbleChart.prototype.wrapText = function () {
    $(this.config.container).find(".wrap").each(function () {
        d3plus.textwrap()
            .container(d3.select(this))
            .resize(true)
            .align("middle")
            .valign("middle")
            .draw();
    })
}

/**
 *
 */
BubbleChart.prototype.buildGauge = function (node) {
    var g = node.append("g");
    var thiz = this;

    g.append("clipPath")
        .attr("id", function (d) {
            return "g-clip-" + d3plus.string.strip(d.name);
        })
        .append("rect")
        .attr("id", function (d) {
            return "g-clip-rect" + d3plus.string.strip(d.name);
        })
        .attr("y", function (d) {
            return -d.r + offset;
        })
        .attr("x", function (d) {
            return -d.r + offset;
        })
        .attr("width", function (d) {
            return 2 * d.r - offset;
        })
        .attr("height", function (d) {
            var t = 2 * d.r - offset;
            return t * ((100 - d.percentage) / 100);
        });

    g.append("circle")
        .attr("r", function (d) {
            return d.r - 5;
        })
        .attr("class", "shape")
        .attr("fill", "#FFF")
        .attr("clip-path", function (d) {
            return "url(#" + "g-clip-" + d3plus.string.strip(d.name) + ")";
        });

    g.append("text")
        .attr("class", "wrap")
        .style("fill", function (d) {
            var c = color(d.name);
            return d3plus.color.text(c);
        })
        .style("stroke", function (d) {
            var c = color(d.name);
            return c;
        })
        .text(function (d) {
            return thiz.config.format.text(d.name);
        });
}

/**
 *
 */
BubbleChart.prototype.createTooltip = function (d) {
    var thiz = this;
    var data = [{
        "value": thiz.config.format.number(d.value),
        "name": d3plus.string.title(thiz.config.size)
    }];
    data = this.config.tooltip ? this.config.tooltip(d) : data;

    var config = {
        "id": thiz.config.scope + "_visualization_focus",
        "x": d.x,
        "y": d.y - d.r / 2,
        "allColors": true,
        "size": "small",
        "color": color(d.name),
        "fontsize": "15px",
        "data": data,
        "width": "219px",
        "mouseevents": true,
        "arrow": true,
        "anchor": "top left",
        "title": d3plus.string.title(d.name),
    }
    d3plus.tooltip.create(config);
}


// Returns a flattened hierarchy containing all leaf nodes under the root.
BubbleChart.prototype.buildNodes = function (data) {
    var classes = [];
    var thiz = this;

    function recurse(node) {
        if (node.length) {
            node.forEach(function (child) {
                recurse(child);
            });
        } else {
            classes.push({
                name: node[thiz.config.label],
                value: node[thiz.config.size],
                percentage: node[thiz.config.percentage]
            });
        }
    }

    recurse(data);
    return {
        children: classes
    };
}
