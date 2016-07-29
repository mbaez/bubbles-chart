function BubbleAnimation(config) {
    this.config = config;
    this.initialize();
}

BubbleAnimation.prototype.animationTick = function (method, validate, speed) {
    var thiz = this;
    speed = speed ? speed : this.config.animation.speed;
    var interval = setInterval(function () {
        var waves = $(".wave");
        if (validate(waves.length)) {
            thiz[method]();
        } else {
            clearInterval(interval);
        }
    }, speed);
}

BubbleAnimation.prototype.initialize = function () {
    if (this.config.method == "recursive") {
        this.animate();
        return;
    }

    this.animationTick("animate", function (l) {
        return l > 0;
    }, 10);
}

/**
 * If the visualization si liquid, this method implement svg
 * transitions to the wave path
 */
BubbleAnimation.prototype.animateWave = function (wave) {
    var thiz = this;
    wave.attr('transform', function (d) {
        return 'translate(' + d.r + ')';
    });
    wave.transition()
        .duration(this.config.speed)
        .ease('linear')
        .attr('transform', function (d) {
            return 'translate( -' + d.r + ')';
        })
        .attr('T', 1)
        .each('end', function () {
            wave.attr('T', 0);
            if (thiz.config.method == "recursive") {
                thiz.animateWave(wave);
            }
        });
}

BubbleAnimation.prototype.animate = function () {
    var thiz = this;
    var waves = d3.selectAll("path")
        .filter(function (d) {
            var wave = d3.select(this);
            return wave.attr("T") == 0;
        })
        .each(function (d, i) {
            var wave = d3.select(this);
            if (wave.attr("T") > 0) {
                return;
            }
            thiz.animateWave(wave);
        });
}
