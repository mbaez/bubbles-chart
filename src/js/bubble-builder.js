/**
 * Bubble chart visualization builder
 * @param {Config} options
 */
function BubbleBuilder(config, ui) {
    this.dataArray = [];
    this.timeArray = [];
    this.timeSelection = [];
    this.config = config;
    //this.ui = ui;
    this.initialize();
}
BubbleBuilder.prototype = new UiBuilder();
BubbleBuilder.prototype.constructor = UiBuilder;


/**
 * Initialize visualization builder.
 */
BubbleBuilder.prototype.initialize = function (options) {
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
 * Set visualization data.
 * @param{Array} data
 */
BubbleBuilder.prototype.data = function (data) {
    this.dataArray = $.extend([], data, true);
    this.builder(data)
    if (this.config.time) {
        this.timeline();
    }
    if (this.config.toggle.size) {
        this.sizeToggle();
    }

    this.wrapText();
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
