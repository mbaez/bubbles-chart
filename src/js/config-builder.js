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
        offset: 5,
        padding: 30,
        tooltip: false,
        level: 0,
        levels: [],
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
        timeContainer: "footer",
        listBubble: {
            minRadius: 2,
            maxRadius: 25,
            padding: 5
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
