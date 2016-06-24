function TreeBuilder(config) {
    this.config = config;
    this.rscale = 0;
    this.initialize();
}

TreeBuilder.prototype = new UiBuilder();
TreeBuilder.prototype.constructor = UiBuilder;

TreeBuilder.prototype.prepareData = function (data) {
    var thiz = this;
    data[thiz.config.size] = d3.sum(data.children, function (d) {
        return d[thiz.config.size];
    });
    data.max = d3.max(data.children, function (d) {
        return d[thiz.config.size];
    });

    data.min = d3.min(data.children, function (d) {
        return d[thiz.config.size];
    });
    data.min = data.min == data.max ? 0 : data.min;

    this.rscale = d3.scale.linear()
        .domain([data.min, data.max])
        .range([0, this.diameter / 10]);

    return data;
}

/**
 * Initialize visualization builder.
 */
TreeBuilder.prototype.initialize = function (options) {
    this.prepareContainer();
    if (typeof this.config.levels != "undefined") {
        this.breadcrumbs();
    }
}

TreeBuilder.prototype.data = function (data) {
    var gdata = this.prepareData(data);
    this.builder(gdata);
}

TreeBuilder.prototype.circle = function (node) {
    var thiz = this;;

    function r(d, offset) {
        offset = offset ? offset : 0;
        var r = thiz.rscale(d[thiz.config.size]) - offset;
        if (d.max) {
            r = thiz.rscale(d.max) * 1.5 - offset;
        }
        d.r = r;
        return r < 10 ? 10 : r;
    }

    node.append("circle")
        .attr("class", "shape")
        .attr("r", r)
        .style("fill", function (d) {
            return thiz.config.color(d[thiz.config.label]);
        })
        .style("stroke", function (d) {
            var c = thiz.config.color(d[thiz.config.label]);
            return d3plus.color.legible(c);
        });

    this.text(node);

    var c = node.append("circle")
        .attr("class", "shape-border")
        .filter(function (d) {
            return !d.parent;
        })
        .attr("r", function (d) {
            return r(d, 5);
        })
        .style("fill", "transparent")
        .style("stroke", "white")
        .style("stroke-dasharray", "5,5")
        .style("stroke-width", "1px");
}


TreeBuilder.prototype.builder = function (gdata) {
    var vizId = "#" + this.vizId;
    var thiz = this;
    var viz = document.getElementById(this.vizId);
    viz.innerHTML = "";
    orbitScale = d3.scale.linear().domain([1, 3]).range([3.8, 1.5]).clamp(true);

    var orbit = d3.layout.orbit().size([this.diameter, this.diameter])
        .children(function (d) {
            return d.children
        })
        .revolution(function (d) {
            return d.depth
        })
        .orbitSize(function (d) {
            return orbitScale(d.depth)
        });

    orbit.nodes(gdata);

    var nodes = d3.select(vizId)
        .append("svg")
        .selectAll("g.node")
        .data(orbit.nodes())
        .enter()
        .append("g")
        .attr("class", function (d) {
            var clazz = "node";
            if (!d.parent) {
                clazz += " center";
            }
            return clazz;
        }).attr("transform", function (d) {
            if (!d.parent) {
                return "translate(" + d.x + "," + d.y + ")"
            }
            return "translate(" + d.x0 + "," + d.y0 + ")"
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
        .on("click", function (d) {
            thiz.onClick(d3.select(this), d)
        });

    nodes.transition()
        .duration(this.config.tree.speed)
        .ease('linear')
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")"
        })
        .attr('T', 1)
        .each('end', function () {
            nodes.attr('T', 0);
        })

    this.circle(d3.selectAll("g.node"));

    d3.select("svg").selectAll("circle.orbits")
        .data(orbit.orbitalRings())
        .enter()
        .insert("circle", "g")
        .attr("class", "ring")
        .attr("r", function (d) {
            return d.r
        })
        .attr("cx", function (d) {
            return d.x
        })
        .attr("cy", function (d) {
            return d.y
        })
        .style("fill", "none")
        .style("stroke", "black")
        .style("stroke-dasharray", "2,2")
        .style("stroke-width", "1px");

    this.wrapText();
}


TreeBuilder.prototype.onClick = function (node, d) {
    var thiz = this;
    var $center = d3.select(".node.center");
    var cr = $center.select("circle.shape").attr("r");
    var cxy = $center.attr("transform");
    if (!d.children) {
        return;
    }

    function getCleandata(d) {
        var tmp = {}
        tmp[thiz.config.label] = d[thiz.config.label];
        tmp[thiz.config.size] = d[thiz.config.size];
        tmp.children = d.children;
        tmp._parent = d._parent ? d._parent : d.parent;
        return tmp;
    }

    node.transition()
        .duration(this.config.tree.speed)
        .ease('linear')
        .attr('transform', cxy)
        .attr('T', 1)
        .each('end', function () {
            node.attr('T', 0);
        });

    node.select(".shape")
        .transition()
        .duration(this.config.tree.speed)
        .ease('linear')
        .attr("r", cr)
        .attr('T', 1)
        .each('end', function (d) {
            node.select(".shape").attr('T', 0);
            if (!d.children) {
                return;
            }
            if (d.max) {
                if (d._parent) {
                    thiz.config.level -= 1;
                    thiz.data(getCleandata(d._parent));
                    thiz.drillup(d);
                }
            } else {
                thiz.data(getCleandata(d));
                thiz.updateBreadcrumbs(d);
                thiz.config.level += 1;
            }
        });
}
