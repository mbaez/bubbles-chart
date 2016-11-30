/**
 * Montion Bubble graph
 */
function MotionBubble(config) {
    UiBuilder.call(this, config);
    this.rscale = 0;
    this.damper = 0.15;
    this.layoutGravity = -0.01;
    this.xpadding = 80;
    this.ypadding = 100;
    this.txtHeight = 50;

    if (config) {
        this.initialize();
    }
}

MotionBubble.prototype = new UiBuilder();
MotionBubble.prototype.constructor = MotionBubble;

/**
 * Se ecnarga de preparar los contenedores donde se renderizarán
 * Los componentes.
 */
MotionBubble.prototype.prepareContainer = function () {
    UiBuilder.prototype.prepareContainer.call(this);
    var $viz = $("#" + this.vizId);
    $viz.width(this.width);

    this.center = {
        x: this.width / 2,
        y: this.diameter / 2
    };
}

/**
 * Se encarga de construir los filtros de la parte superior
 */
MotionBubble.prototype.buildFilter = function () {
    var filters = [];
    if (this.config.filters.length > 0) {
        filters.push({
            text: "Todos",
            value: "all"
        });
        filters = filters.concat(this.config.filters);
    }
    var container = this.headerId;
    var $footer = $("#" + container);
    var $toogle = $("<div></div>");
    $toogle.addClass("bubble-toogle");
    $toogle.attr("id", container + "-toogle");
    $footer.append($toogle);
    var thiz = this;
    var toggle = d3plus.form()
        .data(filters)
        .container("#" + container + "-toogle")
        .id("value")
        .text("text")
        .type("toggle")
        .draw();

    $footer.find(".d3plus_toggle").on("click", function (d) {
        var $target = $(this)[0];
        var data = $target["__data__"];
        if (typeof data != "undefined") {
            if (data.value !== "all") {
                if (thiz.config.autoHideLegend) {
                    $("#" + thiz.legendId).hide();
                    $("#" + thiz.legendColorId).hide();
                }
                thiz.groupAll(thiz.circles, data.value);
            } else {
                $("#" + thiz.legendId).show();
                $("#" + thiz.legendColorId).show();
                thiz.groupAll(thiz.circles);
            }
        }
    });
}

MotionBubble.prototype.getMaxRadius = function (attr) {
    var max = null;
    for (var key in this.filtersData[attr]) {
        var d = this.filtersData[attr][key];
        if (typeof d != "string") {
            max = max == null || max < d.r ? d.r : max;
        }
    }
    return max;
}

/**
 * Se encarga de calcular el centro de los filtros
 */
MotionBubble.prototype.calculateFilterCenter = function () {
    this.filterCenters = {};
    var $viz = $("#" + this.vizId);
    var cols = this.config.cols;
    for (var attr in this.filters) {
        this.filterCenters[attr] = {};
        var len = this.filters[attr].length;
        cols = this.config.cols;
        cols = len < cols ? len : cols;
        var nrows = Math.ceil(len / cols);
        nrows = nrows == 1 ? 2 : nrows;
        var dx = (this.width - this.xpadding * 2) / cols;
        var dy = (this.diameter - this.ypadding) / nrows;
        var idx = 1;
        var y0 = this.ypadding / 2;
        //var x0 = xpadding / 2;
        var maxR = 0;
        var x0 = 0;
        var maxY = 0;
        for (var i = 0; i < len; i++) {
            var strTmp = this.filters[attr][i];
            var fdata = this.filtersData[attr][strTmp];
            fdata.r = Math.sqrt(fdata.r);
            if (idx > cols) {
                idx = 1;
                y0 += dy + maxR + this.txtHeight + this.config.bubble.padding;
                maxR = 0;
            }
            // se calcula la y
            var row = parseInt(i / cols);
            var y = y0 + dy + this.txtHeight + this.config.bubble.padding;
            //se calculan los maximos locales
            maxY = maxY < y ? y : maxY;
            maxR = maxR < fdata.r ? fdata.r : maxR;
            //se calcula la x
            var x = 0;
            //si es el primer filtercenter, se parte del xpadding.
            //Además el centro del primer filtro debe estar en dx/2
            if (idx === 1) {
                x = this.xpadding + dx / 2;
            } else {
                // el filtercenter actual debe encontrarse a dx del filtro anterior
                x = x0 + dx;
            }
            //se almacena el x actual como x previa para la siguiente corrida
            x0 = x;

            //x = x - fdata.r * 0.3;
            //se actualiza el heigth
            this.filterCenters[attr][strTmp] = {
                x: x,
                y: y,
                r: fdata.r,
                size: fdata.size,
                filter: strTmp
            }
            idx += 1;
        }

        var tmpy = maxY + maxR * 2 + dy + 2 * this.txtHeight + 2 * this.config.bubble.padding + this.ypadding;
        this.filtersData[attr]["MAX_Y"] = tmpy;
    }
    //se redimensiona el container
    this.resizeViz(this.diameter + this.ypadding);
}




/**
 * Se sobrescribe el método rollup del base builder
 */
MotionBubble.prototype.roolup = function (v, sample) {
    var data = {};
    var thiz = this;
    for (var attr in sample) {
        this.roolupFilters(v, attr);
        for (var i = 0; i < v.length; i++) {
            if (attr == this.config.time) {
                data[attr] = v.map(function (d) {
                    if (thiz.timeArray.indexOf(d[attr]) == -1) {
                        thiz.timeArray.push(d[attr]);
                    }
                    return d[attr];
                });
            } else if (attr == this.config.size) {
                data[attr] = d3.sum(v, function (d) {
                    return d[attr];
                });
            } else {
                data[attr] = v[0][attr];
            }
        }
    }
    return data;
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

    this.sizeData = {};
    this.sizeData.max = max;
    this.sizeData.min = min;
    min = min == max ? 0 : min;
    //se calcula el tamaño máximo que puede tener el radio de las burbujas
    // utilizando un lógica medio rara.
    var nChilds = darray.length - 10;
    nChilds = nChilds < 5 ? 5 : nChilds;
    nChilds = nChilds > 30 ? 30 : nChilds;
    var maxR = this.width / (nChilds);
    // se verifica si no se especificó un máx radius en la coniguración del gráfico.
    var tmpR = typeof this.config.bubble.maxRadius != "undefined" ? this.config.bubble.maxRadius : maxR;
    // si el max radius es mayor al radio calculado se utiliza el calculado ya que esto implica que no
    // hay espacio suficiente para constuir las burubujas con el tamaño especificado.
    maxR = tmpR > maxR ? maxR : tmpR;
    this.config.bubble.maxRadius = maxR;
    // se establece que el tamaño de la menor burbuja es como máximo 3 veces menor que el tamaǹo del max radius.
    this.config.bubble.minRadius = Math.floor(maxR / 3);
    this.rscale = d3.scale.pow()
        .exponent(0.5)
        .domain([min, max])
        .range([this.config.bubble.minRadius, this.config.bubble.maxRadius]);

    //se obtienen todos los keys que definen los colores para 
    //aplicar la clusterización
    this.clusters = [];
    if (thiz.config.cluster) {
        for (var key in this.filtersData[this.config.colour]) {
            if (key != "MAX_Y") {
                this.clusters.push(key);
            }
        }
        this.deltaY = Math.floor(this.diameter / this.clusters.length);
    }

    darray.forEach(function (d) {
        if (thiz.config.cluster) {
            d.clusterX = thiz.center.x;
            d.clusterY = (thiz.clusters.indexOf(d[thiz.config.colour]) + 1) * thiz.deltaY;
        } else {
            d.x = Math.random() * thiz.width;
            d.y = Math.random() * thiz.diameter;
        }
        d.value = d[thiz.config.size];
        d.r = thiz.rscale(d.value);
        // se sumarizan los radios de los elementos a filtrar
        for (var attr in thiz.filters) {
            thiz.filtersData[attr][d[attr]].r += d.r * d.r;
        };
    });

    darray = darray.sort(function (a, b) {
        return b[thiz.config.size] - a[thiz.config.size];
    });

    this.calculateFilterCenter();
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
    this.buildFilter();
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
            return thiz.config.color(d[thiz.config.colour]);
        })
        .attr("stroke-width", 1)
        .attr("stroke", function (d) {
            var c = thiz.config.color(d[thiz.config.colour]);
            var b = d3plus.color.legible(c);
            if (c.toUpperCase() == b.toUpperCase()) {
                b = d3plus.color.lighter(c, -0.3);
            }
            return b;
        });

    this.bindMouseEvents(this.circles);
    this.force = this.start();
    this.groupAll(this.circles);
    if (this.config.legend) {
        this.legend();
        this.colorLegend();
    }
}

/**
 *
 */
MotionBubble.prototype.charge = function (d) {
    return -Math.pow(d.r, 2) / 8;
};
/**
 * Se encarga de iniciar la simulación.
 * @returns {d3.layout} el layout
 */
MotionBubble.prototype.start = function () {
    this.circles.transition()
        .ease('linear')
        .duration(this.config.bubble.animation)
        .attr("r", function (d) {
            return d.r;
        });
    return d3.layout.force()
        .nodes(this.nodes)
        .size([this.width, this.diameter]);
};
/**
 * Tick advances the simulation by one time step. That is, the forces on the nodes are 
 * calculated and their positions based on those forces.
 * @param   {object}   e event tick
 * @param   {function} moveCallback callback que se invoca por cada paso de la simulación.
 */
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

/**
 * Se encarga de realizar la animación para centar las burbujas, que se encuentran
 * agrupadas por color. Este método se encarga de aproximar todos los clusters al
 * centro.
 * @param   {String} filter El atributo que por el cual agrupan las burbujas
 */
MotionBubble.prototype.clusterGroup = function (filter) {
    var thiz = this;
    if (filter == this.config.colour) {
        return;
    }
    this.force
        .on('tick', function (e) {
            thiz.tickNodes(e, function (alpha) {
                if (typeof filter == "undefined") {
                    return thiz.moveTowardsCenter(e.alpha, true);
                } else {
                    return thiz.moveTowardsFilter(e.alpha, filter, true);
                }
            });
        });
    this.force.start();
}

/**
 * Se encarga de disparar la agrupación de las burbujas teniendo en cuenta los
 * criterios de filtrado establecidos.
 * @param   {DOM} nodes  los nodos que participan en la simulación.
 * @param   {string} filter El atributo que por el cual agrupan las burbujas.
 */
MotionBubble.prototype.groupAll = function (nodes, filter) {
    var thiz = this;
    var end = false;
    //momento en el que se realizó esta llamada
    var currentTime = new Date().getTime();
    //se almacena en thiz la ultima llamada
    thiz.currentFilterTime = currentTime;
    thiz.hideFilters();
    this.force
        .gravity(this.layoutGravity)
        .charge(this.charge)
        .friction(this.config.firction)
        .on("tick", function (e) {
            thiz.tickNodes(e, function (alpha) {
                if (typeof filter !== "undefined") {
                    if (alpha < 0.08 && thiz.config.cluster && thiz.config.colour != filter) {
                        thiz.force.stop();
                    }
                    return thiz.moveTowardsFilter(alpha, filter, false);

                } else if (alpha < 0.04 && thiz.config.cluster) {
                    thiz.force.stop();
                }
                return thiz.moveTowardsCenter(alpha, false);
            });
        }).on('end', function () {
            //se verifica que solo una vez se inicie la simulación de agrupación.
            if (thiz.config.cluster && !end) {
                thiz.force.stop();
                thiz.clusterGroup(filter);
                end = true;
            }
        });

    if (typeof filter != "undefined") {
        this.resizeViz(this.filtersData[filter]["MAX_Y"]);
        /*
        Se invoca al metodo que renderiza los labels de los grupos luego de
        1 segundo para darle tiempo a que las burbujas se reposicionen.
        */
        setTimeout(function (curtime) {
            //si esta llamada es la última realizada, se dibujan los filtros sino se ignora
            if (thiz.currentFilterTime === curtime) {
                thiz.displayFilters(filter);
            }
        }, this.config.bubble.animation * 0.8, currentTime);
    }
    this.force.start();
};
/**
 * Se encarga de realizar la agrupación inicial, se encarga de mover todas las bubujas al 
 * centro de pantalla.
 * @param   {number} alpha  el intervalo o paso de la animación
 * @param   {boolean}   center campo boleano que activa el método que calcula
 *                             el posicionamiento de las burbujas.
 * @returns {function} la función que corresponde a la implementación del método
 *                    que calcula la ubicación de las burbujas.
 */
MotionBubble.prototype.moveTowardsCenter = function (alpha, center) {
    var thiz = this;
    var ty = 0
    return function (d) {
        ty = thiz.config.cluster && !center ? d.clusterY : thiz.center.y;
        d.x = d.x + (thiz.center.x - d.x) * thiz.damper * alpha;
        return d.y = d.y + (ty - d.y) * thiz.damper * alpha;
    };
};
/**
 * Se encarga de realizar la agrupación inicial, se encarga de mover todas las bubujas al 
 * centro de pantalla.
 * @param   {number} alpha  el intervalo o paso de la animación
 * @param   {String} filter El atributo que por el cual agrupan las burbujas.
 * @param   {boolean}   center campo boleano que activa el método que calcula
 *                             el posicionamiento de las burbujas.
 * @returns {function} la función que corresponde a la implementación del método
 *                    que calcula la ubicación de las burbujas.
 */
MotionBubble.prototype.moveTowardsFilter = function (alpha, filter, center) {
    var thiz = this;
    return function (d) {
        var target = thiz.filterCenters[filter][d[filter]];
        d3.select(this).attr("data-filter", d[filter]);
        var ty = target.y;
        if (filter !== thiz.config.colour && thiz.config.cluster && !center) {
            var deltaY = Math.floor((target.r) / thiz.clusters.length);
            ty += (thiz.clusters.indexOf(d[thiz.config.colour]) + 1) * deltaY;
        } else {

        }

        d.x = d.x + (target.x - d.x) * thiz.damper * alpha;
        d.x = d.x <= 0 ? d.r * 2 : d.x;
        d.x = (d.x + d.r) > thiz.width + thiz.xpadding ? d.x - d.r : d.x;
        d.y = d.y + (ty - d.y) * thiz.damper * alpha;
        return d.y;
    };
}

/**
 * Se encarga de otener la mayor X e Y de los nodos luego del filtrado
 * para determinar la ubicación de los labels.
 */
MotionBubble.prototype.getLabelXY = function (filter) {
    var xy = {
        x: 0,
        y: 0
    };
    var p = this.config.bubble.padding;
    $("#" + this.vizId).find("[data-filter= '" + filter + "']")
        .each(function (e) {
            var cx = parseFloat($(this).attr("cx"));
            var cy = parseFloat($(this).attr("cy"));
            var r = parseFloat($(this).attr("r"));
            xy.x = xy.x == 0 || (cx - r) < xy.x ? cx - r : xy.x;
            xy.y = xy.y == 0 || (cy + r * 2) > xy.y ? cy + r + 2 * p : xy.y;
        });
    return xy;
}

/**
 * Sobrescribe la implementación base que se encarga de construir el 
 * nodo de text.
 * @param   {DOM node elementos que participan en el gráfico.
 * @param   {object}   center corresponde al objeto que mapea los textos a las
 *                            ubicaciones y radio de los nodos.
 * @param   {String} filter El atributo que por el cual agrupan las burbujas.
 * @returns {function} la función que corresponde a la implementación del método
 *                    que calcula la ubicación de las burbujas.
 */
MotionBubble.prototype.text = function (node, center, filter) {
    var thiz = this;
    var g = node
        .append("g")
        .attr("class", "filters")
        .filter(function (d) {
            return typeof center[d].r != "undefined";
        })
        .attr("transform", function (d) {
            var dt = center[d];
            var pts = thiz.getLabelXY(d);
            pts.x += dt.r;
            pts.y += thiz.config.bubble.padding;
            if (thiz.filtersData[filter]["MAX_Y"] <= pts.y) {
                thiz.filtersData[filter]["MAX_Y"] = pts.y + thiz.ypadding;
                thiz.resizeViz(thiz.filtersData[filter]["MAX_Y"]);
            }
            return "translate(" + pts.x + "," + pts.y + ")";
        })
        .attr("text-anchor", "middle");

    var txt = g.append("text")
        .attr("class", "labels")
        .text(function (d) {
            return thiz.config.format.text(d);
        })
        .each(function () {
            var width = thiz.config.listBubble.textWidth;
            var padding = thiz.config.bubble.padding;
            var node = d3.select(this),
                textLength = node.node().getComputedTextLength(),
                text = node.text();
            while (textLength > (width + 2 * padding) && text.length > 0) {
                text = text.slice(0, -1);
                node.text(text + '...');
                textLength = node.node().getComputedTextLength();
            }
        });

    var ntxt = g.append("text")
        .attr("class", "size")
        .text(function (d) {
            var dt = center[d];
            return thiz.config.format.number(dt.size);
        })
        .attr("y", 20);
    return g;
}

MotionBubble.prototype.displayFilters = function (attr) {
    var thiz = this;
    var data = d3.keys(this.filterCenters[attr]);
    var center = thiz.filterCenters[attr];
    var filters = d3.select("#" + this.vizId)
        .select("svg")
        .selectAll(".filters")
        .data(data)
        .enter();
    return thiz.text(filters, center, attr);
};

MotionBubble.prototype.hideFilters = function () {
    d3.select("#" + this.vizId).selectAll(".filters").remove();
    this.resizeViz(this.diameter + this.ypadding);
};
/**
 * Se encarga de construir la leyenda de colores del gráfico.
 */
MotionBubble.prototype.colorLegend = function () {
    var $target = $("#" + this.legendColorId);
    var $ul = $("<ul></ul>");
    var $liTmpl = $("<li><div class='bubble-color'></div><p class='color-label'></p></li>");
    var items = this.filtersData[this.config.colour];
    for (var d in items) {
        var $li = $liTmpl.clone();
        if (d != "MAX_Y") {
            $li.find(".color-label").text(d);
            $li.find(".bubble-color").css("background", this.config.color(d));
            $ul.append($li);
        }
    };
    var h = $("#" + this.vizId).height();
    $target.css("margin-top", (-h) + "px");
    // se añade la lista 
    $target.append($ul);
    //console.log(items);
}

/**
 * Se encarga de construir la leyenda explicativa del gráfico.
 */
MotionBubble.prototype.legend = function () {
    var thiz = this;
    //radio minimo según el dato más pequeño
    var rmin = this.config.bubble.minRadius;
    //radio máximo según el dato más grande
    var rmax = this.config.bubble.maxRadius;
    var h = $("#" + this.vizId).height();
    var container = d3.select("#" + this.legendId)
        .style("margin-top", (-h) + "px")
        .attr("class", "legend-container");

    var overview = container.append("div").attr("class", "legend-overview");
    if (this.config.legend.title) {
        overview.append("h3").text(this.config.legend.title);
    }
    overview.append("p").text(this.config.legend.description);

    var svg = container.append("svg");

    if (this.config.legend.footer) {
        var footer = container.append("div").attr("class", "legend-footer");
        footer.append("p").text(this.config.legend.footer);
    }
    var node = svg.append("g")
        .attr("transform", "translate(" + rmax + ", " + rmax + ")");

    function circle(node, r) {
        return node.append("circle")
            .attr("r", r)
            .attr("class", "legend")
    }

    function text(node, size) {
        var txt = "----- ";
        txt += thiz.config.format.number(size);
        return node.append("text")
            .attr("x", rmax - rmin)
            .text(txt);
    }
    text(node, this.sizeData.max).attr("y", -(rmax - 16));
    circle(node, rmax).attr("cy", 10);

    text(node, this.sizeData.min).attr("y", (rmax - rmin));
    circle(node, rmin).attr("cy", rmax);

}
