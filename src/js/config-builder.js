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
        width: 500,
        height: 500,
        sort: false,
        percentage: false,
        color: d3plus.color.scale,
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
        bubble: {
            minRadius: 10,
            //maxRadius : dinamico
            //maxRadius: 50,
            animation: 2000,
            padding: 10,
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
