function TreeBuilder(config) {
    UiBuilder.call(this, config);
    this.rscale = 0;
    this.initialize();
}

TreeBuilder.prototype = new UiBuilder();
TreeBuilder.prototype.constructor = TreeBuilder;

TreeBuilder.prototype.prepareData = function (data) {
    var thiz = this;
    var childs = this.buildNodes(data.children);
    data.children = childs.children;
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
    var nChilds = 5 + data.children.length;
    nChilds = nChilds < 10 ? 10 : nChilds;
    this.rscale = d3.scale.linear()
        .domain([data.min, data.max])
        .range([0, this.diameter / nChilds]);

    return data;
}


/**
 * 
 */
TreeBuilder.prototype.circle = function (node) {
    var thiz = this;;

    function r(d, offset) {
        offset = offset ? offset : 0;
        var r = thiz.rscale(d[thiz.config.size]) - offset;
        if (d.max) {
            r = thiz.diameter / 6 - offset;
        }
        d.r = r;
        return r < thiz.config.tree.minRadius ? thiz.config.tree.minRadius : r;
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

/**
 * Tieline change handler
 */
TreeBuilder.prototype.onChange = function () {
    var data = $.extend({}, this.dataArray[this.config.level], true);
    this.builder(data);
    this.wrapText();
}

TreeBuilder.prototype.redraw = function (data, step) {
    var lvl = this.config.level + step;
    if (lvl > 0) {
        this.dataArray[lvl] = $.extend({}, data, true);
    } else {
        data = $.extend({}, this.dataArray[lvl], true);
    }
    this.builder(data);
    if (this.config.time) {
        this.timeline();
    }
    this.wrapText();
}

TreeBuilder.prototype.afterData = function (data) {
    this.dataArray[this.config.level] = $.extend({}, data, true);
}

TreeBuilder.prototype.builder = function (data) {
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

    var gdata = this.prepareData(data);
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
}

TreeBuilder.prototype.getCleandata = function (d, step) {
    var tmp = {}
    tmp[this.config.label] = d[this.config.label];
    tmp[this.config.size] = d[this.config.size];
    if (this.config.time && d[this.config.time]) {
        tmp[this.config.time] = d[this.config.time];
    }
    if (d.children) {
        tmp.children = $.extend([], d.children, true);
    }
    var lvl = this.config.level - step;
    if (lvl > 0 && step > 0 || lvl >= 0 && step == 0) {
        tmp._parent = $.extend({}, this.dataArray[lvl], true);
    }
    return tmp;
}

TreeBuilder.prototype.getChild = function (d) {
    var dArray = $.extend({}, this.dataArray[this.config.level], true);
    var tmp = this.buildNodes(dArray.children, false);
    dArray.children = tmp.children;
    for (var i = 0; i < dArray.children.length; i++) {
        if (dArray.children[i][this.config.label] == d[this.config.label]) {
            return dArray.children[i];
        }
    }
    console.error("no child");
}

TreeBuilder.prototype.onClick = function (node, d) {
    var thiz = this;
    var $center = d3.select(".node.center");
    var cr = $center.select("circle.shape").attr("r");
    var cxy = $center.attr("transform");
    if (!d.children) {
        return;
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
                    thiz.redraw(thiz.getCleandata(d._parent, 1), -1);
                    thiz.config.level -= 1;
                    if (thiz.config.levels.length > 0) {
                        thiz.drillup(d);
                    }
                }
            } else {
                thiz.redraw(thiz.getCleandata(thiz.getChild(d), 0), 1);
                if (thiz.config.levels.length > 0) {
                    thiz.updateBreadcrumbs(d);
                    thiz.config.level += 1;
                }
            }
        });
}
