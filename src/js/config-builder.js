/**
 * Default config builder
 * @return {Config}
 */
function ConfigBuilder() {

    var colorPalette = [
    "#FF6384",
    "#4BC0C0",
    "#FFCE56",
    "#c2b9d6",
    "#36A2EB",
    "#8161c7",
    "#196998",
    "#8bc4eb",
    "#4b36eb",
    "#ffe197",
    "#ffa4b7",
    "#98e6e6",
    "#c2b9d6",
    "#36eb7c"
    ];

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
        width: 500,
        height: 500,
        sort: false,
        percentage: false,
        color: d3.scale.ordinal().range(colorPalette),
        color: d3.scale.ordinal().range(colorPalette),
        /**
         * Atributo que define el color de las burbujas. Por defecto
         * se utiliza el label.
         */
        colour: false,
        /**
         * Atributo que define el titulo de los tooltips. Por defecto
         * se utiliza el label.
         */
        title: false,
        /**
         * Leyenda que incluye las referencias a los tamaños de las burbujas.
         */
        leyend: false,
        offset: 5,
        padding: 30,
        /**
         * Custom tooltip
         */
        tooltip: false,
        level: 0,
        /**
         * Para gráficos multilevel, construye el breadcrumbs
         */
        levels: [],
        /**
         * Filtros en forma de switch
         */
        filters: [],
        /**
         * Leyenda del gráfico
         * @config title
         * @config description
         */
        legend: false,
        toggle: {
            title: "",
            size: false
        },
        wave: {
            dy: 11,
            count: 4
        },
        tree: {
            speed: 150,
            minRadius: 10,
        },
        animation: {
            speed: 3000,
            method: "no-recursive"
        },
        cluster: true,
        firction: 0.85,
        bubble: {
            minRadius: 10,
            //maxRadius : dinamico
            //maxRadius: 50,
            animation: 2000,
            padding: 10,
            allText: "Todos"
        },
        cols: 5,
        autoHideLegend: true,
        p: 0.3,
        timeContainer: "footer",

        listBubble: {
            minRadius: 2,
            maxRadius: 25,
            padding: 5,
            textWidth: 200
        },

        /**
         * Default format functions
         */
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
