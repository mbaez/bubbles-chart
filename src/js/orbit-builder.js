function OrbitBuilder(config) {
    TreeBuilder.call(this, config);
    this.rscale = 0;
    this.center = {
        node: [],
        ring: [],
        idx: 0
    }
    this.initialize();
}

OrbitBuilder.prototype = new TreeBuilder();
OrbitBuilder.prototype.constructor = OrbitBuilder;

OrbitBuilder.prototype.builder = function (data) {
    var vizId = "#" + this.vizId;
    var thiz = this;
    var viz = document.getElementById(this.vizId);
    viz.innerHTML = "";
    orbitScale = d3.scale.linear().domain([1, 3]).range([3.8, 1.5]).clamp(true);
    var orbit = d3.layout.orbit()
        .size([this.diameter, this.diameter])
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

    var container = $(vizId).find("svg");
    if (container.length == 0) {
        container = d3.select(vizId)
            .append("svg");
    } else {
        container = d3.select(vizId).select("svg");
    }

    if (this.center.node.length > 0) {
        container.node().appendChild(this.center.node[this.center.idx - 1]);
        container.node().appendChild(this.center.ring[this.center.idx - 1]);
    }

    var nodes = container
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


/**
 * Handler del evento click asociado a cada nodo.
 */
OrbitBuilder.prototype.onClick = function (node, d) {
    if (!d.children) {
        return;
    } else if (!d.parent && !d._parent) {
        return;
    }

    var $center = d3.select(".node.center");
    var cr = $center.select("circle.shape").attr("r");
    var cxy = $center.attr("transform");
    this.animateCenterNode($center, d);
    this.animateRingNode(node, d, {
        cr: cr,
        cxy: cxy
    });
}


/**
 * Maneja las transiciones del nodo perteneciente al anillo de la burbuja.
 */
OrbitBuilder.prototype.animateRingNode = function (node, pd, options) {
    var thiz = this;
    //transición del nodo desde su ubicación actual al centro.

    if (pd.max) {
        this.transition(node, function (d) {
            return "translate ( " + (d.x * 2) + "," + d.y + ")";
        });
    } else {
        this.transition(node, options.cxy);
    }
    // transición  que modifica el tamaño del radio del nodo para
    // que sea igual al del nodo central.
    node.select(".shape")
        .transition()
        .duration(this.config.tree.speed)
        .ease('linear')
        .attr("r", options.cr)
        .attr('T', 1)
        .each('end', function (d) {
            node.select(".shape").attr('T', 0);
            if (!d.children) {
                return;
            }
            if (d.max) {
                if (d._parent) {
                    thiz.ringDrillup(d);
                }
            } else {
                thiz.ringDrilldown(d);
            }
        });
}

function d3Clone(node) {
    return node.node().cloneNode(true);
}

OrbitBuilder.prototype.animateCenterNode = function ($center, pd) {
    var thiz = this;
    if (pd.max) {
        var tmp = thiz.center.node.pop();
        thiz.center.ring.pop();
        thiz.center.idx -= 1;
        if (thiz.center.idx <= 0) {
            thiz.center.idx = 0;
            return;
        }

        this.transition(d3.select(tmp), function (d) {
            return "translate(" + (pd.x) + "," + pd.y + ")";
        }, function () {
            tmp.remove();
        })

    } else {
        this.transition($center, function (d) {
            return "translate(" + (-d.r / 2) + "," + d.y + ")";
        }, function (el, d) {
            $center.attr("class", "parent")
            var vizId = "#" + thiz.vizId;
            var $ring = d3.select(vizId).selectAll(".ring")
                .attr("cx", 0)
                .attr("r", function (d) {
                    return d.r * 1.3;
                })
                .attr("cy", function (d) {
                    return d.y;
                });

            $ring.attr("class", "parent-ring");

            thiz.center.node.push(d3Clone($center));
            thiz.center.ring.push(d3Clone($ring));
            thiz.center.idx += 1;
        });
    }
}
