function BubbleEvents() {
    this.event = {};
}

/**
 * Call a event handler if exists
 */
BubbleEvents.prototype.trigger = function (name, d) {
    if (typeof this.event[name] != "undefined") {
        this.event[name](d);
    }
}
