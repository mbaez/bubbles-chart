function BaseBuilder(config) {
    BubbleEvents.call(this, config);
    this.dataArray = [];
    this.timeArray = [];
    this.timeSelection = [];
    this.filters = {};
    this.config = config;
}

BaseBuilder.prototype = new BubbleEvents();
BaseBuilder.prototype.constructor = BaseBuilder;


BaseBuilder.prototype.initialize = function () {}


BaseBuilder.prototype.afterData = function (data) {
    this.dataArray = $.extend([], data, true);
}

/**
 * Set visualization data.
 * @param{Array} data
 */
BaseBuilder.prototype.data = function (data) {
    //si es un array
    this.afterData(data);
    this.builder(data)

    if (this.config.time) {
        this.timeline();
    }

    if (this.config.toggle.size) {
        this.sizeToggle();
    }

    if (this.config.levels.length > 0) {
        this.breadcrumbs();
    }

    this.wrapText();
}


/**
 * This method prepare the data for the visualization.
 */
BaseBuilder.prototype.buildNodes = function (data, filter) {
    var thiz = this;
    //activa y desactiva el filtrado
    filter = typeof filter != "undefined" ? filter : true;
    var d = this.groupingData(data, filter);
    for (var i = 0; i < d.length; i++) {
        d[i].value = d[i][thiz.config.size];
    }
    var gdata = {
        children: d
    }
    return gdata;
}

BaseBuilder.prototype.roolupFilters = function (v, attr) {
    var plainFilters = this.config.filters.map(function (e) {
        return e.value;
    });

    if (plainFilters.indexOf(attr) == -1) {
        return;
    }

    this.filters[attr] = typeof this.filters[attr] == "undefined" ? [] : this.filters[attr];
    var thiz = this;
    v.forEach(function (d) {
        if (thiz.filters[attr].indexOf(d[attr]) == -1) {
            thiz.filters[attr].push(d[attr]);
        }
    })
}

/**
 * Prepare the data for the vizualization
 */
BaseBuilder.prototype.roolup = function (v, sample) {
    var data = {};
    var thiz = this;
    for (var attr in sample) {
        this.roolupFilters(v, attr);
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
        } else if (attr == this.config.size) {
            data[attr] = d3.sum(v, function (d) {
                if (typeof d[attr] !== "number") {
                    return parseFloat(d[attr]);
                }
                return d[attr];
            });
        } else if (attr == "children") {
            data[attr] = data[attr] ? data[attr] : [];
            for (var i = 0; i < v.length; i++) {
                for (var j = 0; j < v[i][attr].length; j++) {
                    data[attr].push(v[i][attr][j]);
                }
            }
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
BaseBuilder.prototype.groupingData = function (data, filter) {
    var thiz = this;
    var sampleObj = null;
    var tmp = data.filter(function (d) {
        var show = true;
        if (!filter) {
            return true;
        } else if (typeof d[thiz.config.time] == "undefined") {
            return true;
        } else if (typeof d[thiz.config.time] == "number") {
            show = thiz.timeSelection.indexOf(d[thiz.config.time]) >= 0;
        } else {
            for (var i = 0; i < d[thiz.config.time].length; i++) {
                show = show && thiz.timeSelection.indexOf(d[thiz.config.time][i]) >= 0;
            }
        }
        return thiz.timeSelection.length == 0 || show;
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
