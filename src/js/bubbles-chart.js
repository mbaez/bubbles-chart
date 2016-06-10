/**
 * Default config builder
 * @return {Config} 
 */
function ConfigBuilder() {
    /**
     * @typedef Config
     * @type Object
     * @property {string}container
     * @property {string}label
     * @property {string}size
     * @property {string}[time]
     * @property {Object}[format]
     * @property {function}[percentage]
     * @property {string}[defaultColor]
     * @property {string} [type] values none|wave|liquid
     * @property {boolean}[sort] default true
     * @property {Array}[color]
     * @property {number}[padding]
     */
    return {
        defaultColor: "#ddd",
        type: 'none',
        sort: false,
        percentage: false,
        color: d3plus.color.scale,
        offset: 5,
        padding: 30,
        tooltip: false,
        wave: {
            dy: 11,
            count: 4
        },
        format: {
            text: function (text, key) {
                return d3plus.string.title(text);
            },
            number: function (number, data) {
                return d3plus.number.format(number)
            }
        }
    }
}

/**
 * Bubble chart visualization builder
 * @param {Config} options
 */
function BubbleBuilder(options) {
    this.dataArray = [];
    this.timeArray = [];
    this.timeSelection = [];
    this.event = {};
    this.config = new ConfigBuilder();
    this.initialize(options);
}

/**
 * Call a event handler if exists
 */
BubbleBuilder.prototype.trigger = function (name, d) {
    if (typeof this.event[name] != "undefined") {
        this.event[name](d);
    }
}

/**
 * Initialize visualization builder.
 */
BubbleBuilder.prototype.initialize = function (options) {
    for (var attr in options) {
        if (attr == 'format') {
            options.format = d3plus.object.merge(this.config.format, options.format);
        }
        this.config[attr] = options[attr];
    }

    this.prepareContainer();
}

/**
 * D3 Selectable
 *
 * Bind selection functionality to `ul`, an ancestor node selection
 * with its corresponding child selection 'li'.
 * Selection state update rendering takes place in the `update` callback.
 *
 */
BubbleBuilder.prototype.selectable = function (ul, li, update) {
    function isParentNode(parentNode, node) {
        if (!node) return false;
        if (node === parentNode) return true;
        return isParentNode(parentNode, node.parentNode);
    }

    function selectFirst(selection) {
        selection.each(function (d, i) {
            if (i === 0) d._selected = true;
        });
    }

    function selectLast(selection) {
        selection.each(function (d, i, j) {
            if (i === selection[j].length - 1) d._selected = true;
        });
    }

    var lastDecision;

    function select(d, node) {
        var parentNode = ul.filter(function () {
                return isParentNode(this, node);
            }).node(),
            lis = li.filter(function () {
                return isParentNode(parentNode, this);
            });
        // select ranges via `shift` key
        if (d3.event.shiftKey) {
            var firstSelectedIndex, lastSelectedIndex, currentIndex;
            lis.each(function (dl, i) {
                if (dl._selected) {
                    firstSelectedIndex || (firstSelectedIndex = i);
                    lastSelectedIndex = i;
                }
                if (this === node) currentIndex = i;
            });
            var min = Math.min(firstSelectedIndex, lastSelectedIndex, currentIndex);
            var max = Math.max(firstSelectedIndex, lastSelectedIndex, currentIndex);

            // select all between first and last selected
            // when clicked inside a selection
            lis.each(function (d, i) {
                // preserve state for additive selection
                d._selected = (d3.event.ctrlKey && d._selected) || (i >= min && i <= max);
            });
        } else {
            // additive select with `ctrl` key
            if (!d3.event.ctrlKey) {
                lis.each(function (d) {
                    d._selected = false;
                });
            }
            d._selected = !d._selected;
        }
        // remember decision
        lastDecision = d._selected;
        update();
    }

    ul.selectAll("li")
        .on('mousedown', function (d) {
            select(d, this);
        }).on('mouseover', function (d) {
            // dragging over items toggles selection
            if (d3.event.which) {
                d._selected = lastDecision;
                update();
            }
        });


    var keyCodes = {
        up: 38,
        down: 40,
        home: 36,
        end: 35,
        a: 65
    };

    ul.on('keydown', function () {
        if (d3.values(keyCodes).indexOf(d3.event.keyCode) === -1) return;
        if (d3.event.keyCode === keyCodes.a && !d3.event.ctrlKey) return;

        var focus = ul.filter(':focus').node();
        if (!focus) return;

        d3.event.preventDefault();

        var scope = li.filter(function (d) {
            return isParentNode(focus, this);
        });
        var selecteds = scope.select(function (d) {
            return d._selected;
        });

        if (!d3.event.ctrlKey) {
            scope.each(function (d) {
                d._selected = false;
            });
        }

        var madeSelection = false;
        switch (d3.event.keyCode) {
            case keyCodes.up:
                selecteds.each(function (d, i, j) {
                    if (scope[j][i - 1]) madeSelection = d3.select(scope[j][i - 1]).data()[0]._selected = true;
                });
                if (!madeSelection) selectLast(scope);
                break;
            case keyCodes.down:
                selecteds.each(function (d, i, j) {
                    if (scope[j][i + 1]) madeSelection = d3.select(scope[j][i + 1]).data()[0]._selected = true;
                });
                if (!madeSelection) selectFirst(scope);
                break;
            case keyCodes.home:
                selectFirst(scope);
                break;
            case keyCodes.end:
                selectLast(scope);
                break;
            case keyCodes.a:
                scope.each(function (d) {
                    d._selected = !d3.event.shiftKey;
                });
                break;
        }
        update();
    });
}

/**
 * Create the visualization and timeline container 
 */
BubbleBuilder.prototype.prepareContainer = function () {
    this.diameter = $(this.config.container).height();
    this.width = $(this.config.container).width() - this.config.padding;

    this.diameter = this.diameter < 500 ? 500 : this.diameter;
    this.config.scope = this.config.container.replace("#", "");
    this.vizId = this.config.scope + "-viz";
    this.footerId = this.config.scope + "-footer";
    var $viz = $("<div />");
    $viz.attr("id", this.vizId);

    var $footer = $("<div />");
    $footer.attr("id", this.footerId);

    $(this.config.container).append($viz);
    $(this.config.container).append($footer);
    d3.select(self.frameElement).style("height", this.diameter + "px");

}

/**
 * Build the visualization
 */
BubbleBuilder.prototype.builder = function (data) {
    var thiz = this;
    var bubble = d3.layout.pack()
        .size([this.width, this.diameter])
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
            thiz.createTooltip(d);
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

}

/**
 * Build a svg text node.
 */
BubbleBuilder.prototype.text = function (node, options) {

    function isLikeWhite(c) {
        var dc = 235;
        var rgb = d3.rgb(c);
        return rgb.r >= dc && rgb.g >= dc && rgb.b >= dc;
    }

    var thiz = this;
    return node.append("text")
        .attr("class", "wrap")
        .style("fill", function (d) {
            var c = thiz.config.color(d[thiz.config.label]);
            c = d3plus.color.text(c);
            if (isLikeWhite(c)) {
                return thiz.config.defaultColor;
            }
            return c;
        })
        .text(function (d) {
            return thiz.config.format.text(d[thiz.config.label]);
        });
}

/**
 * Build a svg circle node.
 */
BubbleBuilder.prototype.circle = function (node, options) {
    var thiz = this;
    options = typeof options == "undefined" ? {} : options;
    options.offset = typeof options.offset == "undefined" ? 0 : options.offset;
    options.class = typeof options.class == "undefined" ? "shape" : options.class;

    return node.append("circle")
        .attr("r", function (d) {
            if (d.r < options.offset) {
                return 0;
            }
            return d.r - options.offset;
        })
        .attr("class", options.class)
        .style("fill", function (d) {
            if (typeof options.fill != "undefined") {
                return options.fill;
            }
            return thiz.config.color(d[thiz.config.label]);
        });
}

/**
 * Set visualization data.
 * @param{Array} data
 */
BubbleBuilder.prototype.data = function (data) {
    this.dataArray = $.extend([], data, true);
    this.builder(data)
    if (typeof this.config.time != "undefined") {
        this.timeline();
    }
    this.wrapText();
}

/**
 * Wrapping the text using D3plus text warpping. D3plus automatically
 * detects if there is a <rect> or <circle> element placed directly
 * before the <text> container element in DOM, and uses that element's
 * shape and dimensions to wrap the text.
 */
BubbleBuilder.prototype.wrapText = function () {

    $("#" + this.vizId).find(".wrap")
        .each(function () {
            d3plus.textwrap()
                .container(d3.select(this))
                .resize(true)
                .align("middle")
                .valign("middle")
                .draw();
        })
}

/**
 * If the visualization si liquid, this method implement svg 
 * transitions to the wave path
 */
BubbleBuilder.prototype.animateWave = function (wave) {
    var thiz = this;
    wave.attr('transform', function (d) {
        return 'translate(' + d.r + ')';
    });
    wave.transition()
        .duration(2000)
        .ease('linear')
        .attr('transform', function (d) {
            return 'translate( -' + d.r + ')';
        })
        .attr('T', 1)
        .each('end', function () {
            wave.attr('T', 0);
            thiz.animateWave(wave);
        });
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
        .attr("class", "path")
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
    if (this.config.type == 'liquid') {
        this.animateWave(path);
    }
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
            clip += "#g-clip-" + d3plus.string.strip(d[thiz.config.label]);
            return "url(" + clip + ")";
        });

    this.text(g);
}

/**
 * This methdod build the tooltip.
 */
BubbleBuilder.prototype.createTooltip = function (d) {
    var thiz = this;
    var data = [{
        "value": d[thiz.config.size],
        "name": thiz.config.size
    }];

    if (this.config.percentage) {
        data.push({
            "value": this.config.percentage(d) * 100,
            "name": "Percentage"
        });
    }

    data = this.config.tooltip ? this.config.tooltip(d) : data;
    //se formatean los datos
    for (var i = 0; i < data.length; i++) {
        data[i].name = thiz.config.format.text(data[i].name);
        if (isNaN(data[i].value)) {
            data[i].value = thiz.config.format.text(data[i].value);
        } else {
            data[i].value = thiz.config.format.number(data[i].value);
        }
    }

    //se calcula el tamaño del tooltip
    var maxWidth = 300;
    var maxHeigth = 15 + 35 * data.length;
    var x = d3.event.clientX - maxWidth / 2;
    var y = d3.event.clientY - maxHeigth;
    x = x < 0 ? 0 : x;
    y = x < 0 ? 0 : y;
    var config = {
        "id": thiz.config.scope + "_visualization_focus",
        "x": x,
        "y": y - 20,
        "allColors": true,
        "fixed": true,
        //"offset": 20,
        "size": "small",
        "color": thiz.config.color(d[thiz.config.label]),
        "fontfamily": "Helvetica Neue",
        "fontweight": 200,
        "fontsize": "15px",
        "data": data,
        "width": maxWidth,
        "max_width": maxWidth,
        "mouseevents": false,
        "arrow": true,
        "align": "bottom center",
        "anchor": "top left",
        "title": thiz.config.format.text(d[thiz.config.label]),
    }
    d3plus.tooltip.create(config);
}

/**
 * This method prepare the data for the visualization.
 */
BubbleBuilder.prototype.buildNodes = function (data) {
    var thiz = this;
    var d = this.groupingData(data);
    for (var i = 0; i < d.length; i++) {
        d[i].value = d[i][thiz.config.size];
    }
    return {
        children: d
    };
}

/**
 * Prepare the data for the vizualization
 */
BubbleBuilder.prototype.roolup = function (v, sample) {
    var data = {};
    var thiz = this;
    for (var attr in sample) {
        if (attr == this.config.time) {
            data[attr] = v.map(function (d) {
                if (thiz.timeArray.indexOf(d[attr]) == -1) {
                    thiz.timeArray.push(d[attr]);
                }
                return d[attr];
            });
        } else if (attr == this.config.label) {
            data[attr] = v[0][attr];
        } else if (typeof sample[attr] == "number") {
            data[attr] = d3.sum(v, function (d) {
                return d[attr];
            });
        } else {
            data[attr] = v.map(function (d) {
                return d[attr];
            });
        }
    }
    return data;
}

/**
 * Groupping the array for the visualization
 */
BubbleBuilder.prototype.groupingData = function (data) {
    var thiz = this;
    var sampleObj = null;
    var tmp = data.filter(function (d) {
        return thiz.timeSelection.length == 0 || thiz.timeSelection.indexOf(d[thiz.config.time]) >= 0;
    });
    var filters = d3.nest()
        .key(function (d) {
            sampleObj = d;
            return d[thiz.config.label];
        })
        .rollup(function (v) {
            return thiz.roolup(v, sampleObj);
        }).entries(tmp);

    return filters.map(function (d) {
        return d.values;
    });
}

/**
 * Tieline change handler
 */
BubbleBuilder.prototype.onChange = function () {
    var data = $.extend([], this.dataArray, true);
    this.builder(data);
    this.wrapText();
}

/**
 * Build a timeline for the visualization
 */
BubbleBuilder.prototype.timeline = function () {

    // create lists
    var ul = d3.select("#" + this.footerId)
        .append('ul')
        .attr("class", "timeline")
        .attr('tabindex', 1);
    var thiz = this;
    var time = this.timeArray.sort().map(function (d) {
        var data = {
            "time": d,
            "_selected": true
        };
        return data;
    });

    var li = ul.selectAll('li')
        .data(time)
        .enter()
        .append('li')
        .attr("class", "entry")
        .classed('selected', function (d) {
            return d._selected;
        })
        .append('a')
        .text(function (d) {
            return d.time;
        });

    this.selectable(ul, li, function (e) {
        var selections = []
        ul.selectAll('li')
            .classed('selected', function (d) {
                if (d._selected) {
                    selections.push(d);
                }
                return d._selected;
            })

        //se establecen la selecciones
        thiz.timeSelection = selections.map(function (d) {
            return d.time;
        });
        thiz.onChange();
        thiz.trigger("timechange", thiz.timeSelection);
    });
}

/**
 * Bubble chart visualization builder
 * @param{Config} options
 */
function BubbleChart(options) {
    this.builder = new BubbleBuilder(options);
}

/**
 * Set visualization data.
 * @param{Array} data
 */
BubbleChart.prototype.data = function (data) {
    this.builder.data(data);
}

/**
 * @param event values click|timechange|mouseover|mouseout|mouseenter
 */
BubbleChart.prototype.on = function (event, handler) {
    this.builder.event[event] = handler;
}
