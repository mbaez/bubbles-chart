function OrbitBuilder(config) {
    TreeBuilder.call(this, config);
    this.rscale = 0;
    this.center = {
        node: [],
        ring: [],
        idx: 0
    }

    //this.initialize();
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
 * Se encarga de rotar en relación al anillo central.
 */
OrbitBuilder.prototype.orbitRotate = function (node, pd, options) {
    //node.attr
    var ring = d3.select(".ring");
    var x = parseFloat(ring.attr("cx"));
    var y = parseFloat(ring.attr("cy"));
    var r = parseFloat(ring.attr("r"));
    node.attr("transform", options.cxy);
    var shape = node.select(".shape")
        .attr("cx", function (d) {
            return d.x - x;
        })
        .attr("cy", function (d) {
            return d.y - y;
        });

    var thiz = this;

    function angle(d) {
        var yi = pd.y - (y - r);
        var xi = pd.x - (x - r)

        var yc = r;
        var xc = r;

        var dx = xi - xc;
        var dy = yc - yi;
        //Math.atan((p1y - p2y) / (p2x - p1x)) * (180 / Math.PI);
        var a = Math.atan2(dy, dx) * (180 / Math.PI);
        //console.log(a);
        return a < 0 ? a - 180 : a;
    }

    var speed = this.config.tree.speed / 2;
    shape.transition()
        .duration(speed)
        .ease('cubic')
        .delay(function (d, i) {
            return i * 120;
        })
        .attrTween("transform", function (d, i) {
            var ai = angle(d);
            console.log("angulo:", ai);
            var i = d3.interpolate(0, ai);
            return function (t) {
                return "rotate(" + i(t) + ")";
            };
        })
        .each("end", function () {
            var ctr = node.attr("transform");
            ctr = ctr.split(";");
            console.log(ctr);
            node.select(".shape")
                .transition()
                .duration(speed)
                .ease('linear')
                .attr("cy", function (d) {
                    var cr = d.r < thiz.config.tree.minRadius ? thiz.config.tree.minRadius : d.r;
                    //se utiliza 3 offset, uno por cada elemento(y, r, dr)
                    return y - r - cr - 3 * thiz.config.offset;
                    //return d.x0
                })
                .attr('T', 1)
                .each("end", function () {
                    d3.select(this).attr('T', 0);
                    options.end(node, speed);
                });
        });

}


/**
 * Maneja las transiciones del nodo perteneciente al anillo de la burbuja.
 */
OrbitBuilder.prototype.animateRingNode = function (node, pd, options) {
    var thiz = this;

    // transición  que modifica el tamaño del radio del nodo para
    // que sea igual al del nodo central.
    function reshape(node, speed) {
        speed = speed ? speed : thiz.config.tree.speed;
        node.select(".shape")
            .transition()
            .duration(speed)
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

    if (pd.max) {
        //del nodo central hacia la derecha
        options.cr = this.config.tree.minRadius;
        this.transition(node, function (d) {
            return "translate ( " + (d.x * 2) + "," + d.y + ")";
        }, function () {
            reshape(node);
        });
    } else {
        //options.end();
        //reshape(node);
        options.end = function (node, speed) {
            reshape(node, speed);
        }

        //transición del nodo desde su ubicación actual al centro.
        this.orbitRotate(node, pd, options);
    }
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
        });

    } else {
        this.transition($center, function (d) {
            return "translate(" + (-d.r / 2) + "," + d.y + ")";
        }, function (el, d) {
            $center.attr("class", "parent")
            var vizId = "#" + thiz.vizId;
            var $ring = d3.select(vizId).selectAll(".ring")
                .attr("cx", 0)
                .attr("r", function (d) {
                    return d.r * 1.4;
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
