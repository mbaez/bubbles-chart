# bubble-chart
A javascript library to build bubble chart using d3 and d3plus

## Examples
Test BubbleChart online with JSFiddle

* [Simple bubble chart](https://jsfiddle.net/maxibaezpy/tsx46mhs/)
* [Timeline](https://jsfiddle.net/maxibaezpy/d85tLkjh/)
* [Event Handler](https://jsfiddle.net/maxibaezpy/1buk9fwq/)
* [Simple Gauge chart](https://jsfiddle.net/maxibaezpy/q2r8yy7a/)
* [Wave Gauge chart](https://jsfiddle.net/maxibaezpy/vovz2yku/)
* [Liquid Gauge chart](https://jsfiddle.net/maxibaezpy/vajb4jg4/)


## Usage
Below is quick example how to use :

*Download the latest version library and include it in your html.*

```html
<script src="js/jquery.js"></script>
<script src="js/d3.min.js"></script>
<script src="js/d3plus.min.js"></script>
<script src="js/bubbles-chart.js"></script>
<link href="css/bubbles-chart.css" rel="stylesheet">

```

*Add a container in your html :*

```html
...
<div id="bubbles-chart"></div>
```

*This code build a simple bubble chart*

```javascript
...
var viz = new BubbleChart({
    container: "#bubbles-chart",
    label: "label",
    size: "size"
});

viz.data(data);
```

## Options
The available configuration options from a bubble chart:

#### options.container
Type: `String`

Container where the list will build. 


#### options.label
Type: `Array|String`

The json attribute name that determines the label of the bubble.

#### options.size
Type: `Array`

The json attribute name that determines the size of the bubble.

#### options[time]
Type: `String`

The json attribute name that determines the time of the chart. Define the timeline.

#### options[type]
Type: `String`

Determine the type of fill of the bubble, when percentage filling function is used.
The types available are:

* `none` : simple flat fill.
* `wave` : wave like fill.
* `liquid` : animate wave fill.


#### options[percentage(d)]
Type: `Function`
* `{Object} d`: the visualization data.

Return a number between 0 and 1. Calculates the percentage of the bubble to fill.

```javascript
var vizData =  [{
    "label": "Data1",
    "size": 2065724632,
    "count":50
}, 
//...
{
    "label": "Data3",
    "size": 48130171902,
    "count": 20
}];

var viz = new BubbleChart({
    container: "#bubbles-chart",
    label: "label",
    size: "size",
    percentage: function(d) {
        //Return a number between 0 and 1
        return d.count / 100;
    }
});

//do something
viz.data(data);

```

## Functions
The available functions to interact with the bubble chart:

#### BubbleChart.data(data)
Type: `Function`
* `{Array}data`: the visualization data.

Sets the data associated with your visualization.

```javascript
var vizData =  [{
    "label": "Data1",
    "size": 2065724632,
}, {
    "label": "Data2",
    "size": 141765766652,
}, {
    "label": "Data3",
    "size": 48130171902,
}];

...
var viz = new BubbleChart({
    container: "#bubbles-chart",
    label: "label",
    size: "size"
});

//do someting
...
//setting data
viz.data(vizData);
```

#### BubbleChart.on(event, handler)
Type: `Function`

* `{String}event`: the name of the event.
* `{Function}handler`: handler function.

The events available are:

* `mouseenter` : triggered when the mouse enter into the bubble.
* `mouseover` : triggered when the mouser is over the bubble.
* `mouseout` : triggered when the mouse left the bubble.
* `click` : triggered when the bubble clicked.

```javascript 
var viz = new BubbleChart({...});

viz.on("mouseenter", function(d) {
  //do someting
  console.log("mouseenter", d);
});

viz.on("mouseover", function(d) {
  //do someting
  console.log("mouseover", d);
});

viz.on("mouseout", function(d) {
  //do someting
  console.log("mouseout", d);
});

viz.on("click", function(d) {
  //do someting
  console.log("mouseclick", d);
});

//setting data
viz.data(vizData);

```

## Want to contribute?

If you've found a bug or have a great idea for new feature let me know by [adding your suggestion]
(http://github.com/mbaez/bubbles-chart/issues/new) to [issues list](https://github.com/mbaez/bubbles-chart/issues).
