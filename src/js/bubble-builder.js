/**
 * Bubble chart visualization builder
 * @param {Config} options
 */
function BubbleBuilder(config) {
    UiBuilder.call(this, config);
    this.initialize();
}

BubbleBuilder.prototype = new UiBuilder();
BubbleBuilder.prototype.constructor = BubbleBuilder;


/**
 * Build the visualization
 */
BubbleBuilder.prototype.builder = function (data) {
    var thiz = this;
    var bubble = d3.layout.pack()
        .size([this.diameter, this.diameter])
        .padding(1.5);

    if (this.config.sort) {
        bubble.sort(function (a, b) {
            return a.value - b.value;
        });
    }

    var vizId = "#" + this.vizId;
    $(vizId).html("");
    var svg = d3.select(vizId)
        .append("svg")
        .attr("width", this.width)
        .attr("height", this.diameter)
        .attr("class", "bubble");

    var node = svg.selectAll(".node")
        .data(bubble.nodes(this.buildNodes(data))
            .filter(function (d) {
                return !d.children;
            }))
        .enter().append("g")
        .attr("class", "node")
        .on('click', function (d) {
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
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    var gnode = node.append("g");
    var main = this.circle(gnode)
        .style("stroke", function (d) {
            var c = thiz.config.color(d[thiz.config.label]);
            return d3plus.color.legible(c);
        });

    if (this.config.percentage) {
        this.circle(gnode, {
                offset: thiz.config.offset
            })
            .style("stroke", "#FFF")
            .style("stroke-width", "2px");

        this.buildGauge(node);

    } else {
        this.circle(gnode);
        this.text(gnode);
    }

    if (this.config.type == 'liquid') {
        this.animation = new BubbleAnimation(this.config.animation);
    }
}



/**
 * Calcule percentage of the circle to fill.
 */
BubbleBuilder.prototype.fillPercentage = function (d) {
    if (2 * d.r < this.config.offset) {
        return 0;
    }
    var p = this.config.percentage(d);
    p = 2 * d.r * (1 - p);
    return p < 0 ? 0 : parseInt(p);
}

/**
 * Build a wave path
 */
BubbleBuilder.prototype.buildWave = function (clip) {
    var thiz = this;
    var path = clip.append("path")
        .attr("id", function (d) {
            return "g-clip-rect" + d3plus.string.strip(d[thiz.config.label]);
        })
        .attr("class", "path wave")
        .attr('T', 0)
        .attr("d", function (d) {
            var p = thiz.fillPercentage(d);
            if (p == 0) {
                return "";
            }

            var x = parseInt(-d.r * 2);
            var dx = parseInt(d.r * 4 / thiz.config.wave.count);
            var b = "";
            var y0 = p - d.r;
            while (x < d.r * 2) {
                b += " M " + x + " " + y0 + " q " + (dx / 2) + " " + thiz.config.wave.dy + " " + dx + " " + 0;
                x += dx;
            }
            return b + "";
        });
}

/**
 * Build a gauge svg paht
 */
BubbleBuilder.prototype.buildGauge = function (node) {
    var g = node.append("g");
    var thiz = this;
    var clip = g.append("clipPath")
        .attr("id", function (d) {
            return "g-clip-" + d3plus.string.strip(d[thiz.config.label]);
        });

    clip.append("rect")
        .attr("id", function (d) {
            return "g-clip-rect" + d3plus.string.strip(d[thiz.config.label]);
        })
        .attr("y", function (d) {
            return -d.r + thiz.config.offset;
        })
        .attr("x", function (d) {
            return -d.r + thiz.config.offset;
        })
        .attr("width", function (d) {
            if (2 * d.r < thiz.config.offset) {
                return 0;
            }
            return 2 * d.r - thiz.config.offset;
        })
        .attr("height", function (d) {
            var p = thiz.fillPercentage(d);
            p += thiz.config.offset - thiz.config.wave.dy + 1;
            return p < 0 ? 0 : p;
        });


    if (this.config.type == 'liquid' || this.config.type == 'wave') {
        this.buildWave(clip);
    }

    this.circle(g, {
            offset: thiz.config.offset,
            fill: "#FFF"
        })
        .attr("clip-path", function (d) {
            var clip = window.location.href;
            clip = clip.split("#")[0];
            clip += "#g-clip-" + d3plus.string.strip(d[thiz.config.label]);
            return "url(" + clip + ")";
        });

    this.text(g);
}

BubbleBuilder.prototype.sizeToggle = function () {
    var $footer = $("#" + this.footerId);
    var $toogle = $("<div></div>");
    $toogle.addClass("bubble-toogle");
    $toogle.attr("id", this.footerId + "-toogle");
    $footer.append($toogle);
    var thiz = this;
    var toggle = d3plus.form()
        .data(this.config.toggle.size)
        .title(this.config.toggle.title)
        .container("#" + this.footerId + "-toogle")
        .id("value")
        .text("text")
        .type("toggle")
        .draw();

    $footer.find(".d3plus_toggle").on("click", function (d) {
        var $target = $(this)[0];
        var data = $target["__data__"];
        if (typeof data != "undefined") {
            thiz.config.size = data.value;
            thiz.onChange();
        }
    });
}
