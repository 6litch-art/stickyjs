
jQuery.event.special.scrolldelta = {

    delegateType: "scroll",
    bindType: "scroll",
    handle: function (event) {

        var handleObj = event.handleObj;
        var targetData = jQuery.data(event.target);

        var ret = null;
        var elem = event.target;

        if (targetData.elastic && targetData.interval === undefined) {

            if(event.scrollT === undefined) {
            
                targetData.time0 = new Date().getTime();
                targetData.time  = targetData.time || targetData.time0;
            }

            targetData.eventListener = elem.addEventListener('scrolldelta:holding', function (e) {
    
                var targetData = jQuery.data(e.target);
                e = Sticky.compute(e, targetData);
                Sticky.onWheel(e);

                event.type = handleObj.origType;
                ret = handleObj.handler.apply(this, arguments);
                event.type = handleObj.type;

            }, false);

            targetData.interval = setInterval(function () {

                targetData.time = new Date().getTime();

                var eventHolding = new Event('scrolldelta:holding');
                if(targetData.elastic) elem.dispatchEvent(eventHolding);
                else {

                    if(targetData.eventListener) 
                        elem.removeEventListener(targetData.eventListener);
                    
                    clearInterval(targetData.interval);
                    targetData.interval = undefined;

                    targetData.time0 = undefined;
                    targetData.time  = undefined;
                }

            }, Sticky.get("throttle"));

        } else {

            targetData.time0 = undefined;
            targetData.time  = undefined;
        }

        event = Sticky.compute(event, targetData);

        event.type = handleObj.origType;
        ret = handleObj.handler.apply(this, arguments);
        event.type = handleObj.type;

        return ret;
    }
};

$.fn.serializeObject = function () {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function () {
        if (o[this.name]) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

;
(function (root, factory) {

    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.Sticky = factory();
    }

})(this, function () {

    var Sticky = {};
    Sticky.version = '0.1.0';

    var Settings = Sticky.settings = {
        "overscroll": {
            "top":false,
            "bottom":false,
            "left":false,
            "right":false,
        },
        "throttle": 250,
        "threshold": 500
    };

    var debug = false;
    var ready = false;
    Sticky.ready = function (options = {}) {

        Sticky.configure(options);
        ready = true;

        dispatchEvent(new Event('sticky:ready'));
        if (debug) console.log("Sticky is ready.");

        return this;
    };

    Sticky.get = function(key) {
    
        if(key in Sticky.settings) 
            return Sticky.settings[key];

        return null;
    };

    Sticky.set = function(key, value) {
    
        Sticky.settings[key] = value;
        return this;
    };

    Sticky.add = function(key, value) {
    
        if(! (key in Sticky.settings))
            Sticky.settings[key] = [];

        if (Sticky.settings[key].indexOf(value) === -1)
            Sticky.settings[key].push(value);

        return this;
    };

    Sticky.remove = function(key, value) {
    
        if(key in Sticky.settings) {
        
            Sticky.settings[key] = Sticky.settings[key].filter(function(setting, index, arr){ 
                return value != setting;
            });

            return Sticky.settings[key];
        }
        
        return null;
    };

    Sticky.configure = function (options) {

        var key, value;
        for (key in options) {
            value = options[key];
            if (value !== undefined && options.hasOwnProperty(key)) Settings[key] = value;
        }

        if (debug) console.log("Sticky configuration: ", Settings);

        return this;
    };

    Sticky.compute = function(event) {

        var targetData = jQuery.data(event.target);

        var elem = event.target;
        if (elem === document)
            elem = document.documentElement;
        if (elem === window)
            elem = document.documentElement;

        var elemRect = elem.getBoundingClientRect();
        var dY = targetData.top  || 0;
        var dX = targetData.left || 0;

        targetData.time0 = targetData.time0 || new Date().getTime();
        targetData.time  = targetData.time  || targetData.time0;
        var dT = targetData.time;

        // Screen & viewport positioning
        targetData.vw = Math.round(Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0));
        targetData.vh = Math.round(Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0));
        targetData.width  = elemRect.width;
        targetData.height = elemRect.height

        // Scrolling information
        targetData.time0 = targetData.time0 || new Date().getTime();
        targetData.time  = targetData.time  || targetData.time0;

        targetData.top        = Math.round(-elemRect.top);
        targetData.topCounter = targetData.topCounter || 0;
        if (targetData.top    == 0 && targetData.top < dY)
            targetData.topCounter    = (targetData.top    == 0 && dY ? targetData.topCounter    + 1 : targetData.topCounter   ) || 0;

        targetData.bottom = Math.round(elemRect.bottom - targetData.vh);
        targetData.bottomCounter = targetData.bottomCounter || 0;
        if (targetData.bottom == 0 && targetData.top > dY)
            targetData.bottomCounter = (targetData.bottom == 0 && dY ? targetData.bottomCounter + 1 : targetData.bottomCounter) || 0;

        targetData.left   = Math.round(-elemRect.left);
        targetData.leftCounter = targetData.leftCounter || 0;
        if (targetData.left   == 0 && targetData.left < dX)
            targetData.leftCounter   = (targetData.left   == 0 && dX ? targetData.leftCounter   + 1 : targetData.leftCounter  ) || 0;

        targetData.right  = Math.round(elemRect.right - targetData.vw);
        targetData.rightCounter = targetData.rightCounter || 0;
        if (targetData.right  == 0 && targetData.left > dX)
            targetData.rightCounter  = (targetData.right  == 0 && dX ? targetData.rightCounter  + 1 : targetData.rightCounter ) || 0;

        targetData.topElastic    = targetData.top < 0;
        if(Sticky.get("overscroll").top) {
            targetData.topElastic = true;
            targetData.top = -1;
        }

        targetData.leftElastic   = targetData.left < 0;
        if(Sticky.get("overscroll").left) {
            targetData.leftElastic = true;
            targetData.left = -1;
        }

        targetData.bottomElastic = targetData.bottom < 0;
        if(Sticky.get("overscroll").bottom) {
            targetData.bottomElastic = true;
            targetData.bottom = -1;
        }

        targetData.rightElastic  = targetData.right < 0;
        if(Sticky.get("overscroll").right) {
            targetData.rightElastic = true;
            targetData.right = -1;
        }

        targetData.elastic       = targetData.topElastic || targetData.bottomElastic || targetData.leftElastic || targetData.rightElastic;
        event.screen = {
            "height":targetData.height,
            "width":targetData.width,
            "vh":targetData.vh,
            "vw":targetData.vw,
        };
        
        event.deltaX  = targetData.left - dX;
        event.scrollX = {
            "delta"   : targetData.left - dX,
            "left": targetData.left,
            "leftCounter" : targetData.leftCounter,
            "leftElastic" : targetData.leftElastic,
            "right": targetData.right,
            "rightCounter" : targetData.rightCounter,
            "rightElastic" : targetData.rightElastic,
            "time"    : 0
        };

        event.deltaY  = targetData.top - dY;
        event.scrollY = {
            "delta"   : targetData.top - dY,
            "top": targetData.top,
            "topCounter" : targetData.topCounter,
            "topElastic" : targetData.topElastic,
            "bottom": targetData.bottom,
            "bottomCounter" : targetData.bottomCounter,
            "bottomElastic" : targetData.bottomElastic,
            
        };

        event.scrollT = {
            "delta" : Math.abs(targetData.time0 - dT),
            "t0"    : targetData.time0,
            "elastic" : targetData.elastic,
        }

        return event;
    };

    Sticky.overscrollTop    = function(event) {
        var deltaY = (event.deltaY !== undefined ? event.deltaY : event.originalEvent.deltaY);
        return $(window).height() != $(document).height() && window.scrollY === 0 && deltaY < 0;
    }  
    Sticky.overscrollBottom = function(event) { 
        var deltaY = (event.deltaY !== undefined ? event.deltaY : event.originalEvent.deltaY);
        return $(window).height() != $(document).height() && Math.ceil(window.scrollY + $(window).height()) >= $(document).height() && deltaY > 0;
    }
    Sticky.overscrollLeft   = function(event) { 
        var deltaX = (event.deltaX !== undefined ? event.deltaX : event.originalEvent.deltaX);
        return $(window).width() != $(document).width() && window.scrollX === 0 && deltaX < 0;
    }
    Sticky.overscrollRight  = function(event) { 
        var deltaX = (event.deltaX !== undefined ? event.deltaX : event.originalEvent.deltaX);
        return $(window).width() != $(document).width() && Math.ceil(window.scrollX + $(window).width()) >= $(document).width() && deltaX > 0;
    }

    Sticky.onLoad = function () {

        if (debug) console.log("Sticky loading.");
        dispatchEvent(new Event('load'));
    }

    Sticky.onScrollDelta = function (e) {

        if (debug) console.log("Sticky delta scrolling.. ", e.scrollY, e.scrollX, e.scrollT, e.screen);

        $(".sticky-top").each(function() {

            if(e.scrollY.top > this.clientHeight || $(this).hasClass("show")) {

                // Prevent element shaking
                if(Sticky.get("transition") && Sticky.get("transition").indexOf(this) !== -1) return;
                this.addEventListener("transitionstart", function() { Sticky.add("transition", this);    }, {"once": true});
                this.addEventListener("transitionend", function()   { Sticky.remove("transition", this); }, {"once": true});

                // Action element
                if(e.scrollY.delta < 0 && e.scrollY.bottom > 0) {

                    $(this).addClass("show");
                    $(this).removeAttr("style");
                    $(this).removeClass("skip-transition");
                    
                } else {
                
                    $(this).removeClass("show");
                    $(this).css("top", -this.clientHeight);
                    if(e.scrollY.top == e.scrollY.delta)
                        $(this).addClass("skip-transition");
                }

            } else { // Smooth transition

                Sticky.remove("transition", this);

                $(this).css("top", Math.min(0,-e.scrollY.top));
                if(e.scrollY.top > 0)
                    $(this).addClass("skip-transition");

            }
        });

        $(".sticky-widget").each(function() {
        
            $(this).addClass("skip-transition");

            var firstChild = this.firstElementChild;
            var offsetTop = Math.max(parseInt($(this).css("margin-top")), parseInt($(firstChild).css("margin-top")));
            $(this).css("top", offsetTop);
            $(this).css("margin-top", offsetTop);
            $(firstChild).css("margin-top", 0);

            var lastChild = this.lastElementChild;
            var offsetBottom = Math.max(parseInt($(this).css("margin-bottom")), parseInt($(lastChild).css("margin-bottom")));
            $(this).css("margin-bottom", offsetBottom);
            $(lastChild).css("margin-bottom", 0);
        });

        $(".sticky-bottom").each(function() {
        
            if($(this).hasClass("show")) {

                // Action element
                if (e.scrollY.bottom > this.clientHeight) {

                    $(this).removeClass("show");
                    $(this).removeClass("skip-transition");
                    $(this).removeAttr("style");

                } else { // Smooth transition

                    $(this).css("bottom", Math.min(0,-e.scrollY.bottom));
                    if(e.scrollY.bottom > 0) $(this).addClass("skip-transition");
                }
    
            } else if (e.scrollY.bottom <= 0 && e.scrollT.delta > Sticky.get("threshold")) {

                $(this).addClass("show");
                $(this).removeAttr("style");
            }
        });
    }

    Sticky.onWheel = function (event) {
      
        var overscroll = {top:false, right:false, bottom:false, left:false};
        overscroll.top    = Sticky.overscrollTop(event);
        overscroll.bottom = Sticky.overscrollBottom(event);
        overscroll.left   = Sticky.overscrollLeft(event);
        overscroll.right  = Sticky.overscrollRight(event);

        Sticky.set("overscroll", overscroll);
        if(overscroll.top || overscroll.bottom || overscroll.left || overscroll.right)
            $(window).trigger('scrolldelta');
    };

    Sticky.onLoad();
    
    $(window).on('wheel', Sticky.onWheel);
    $(window).on('scrolldelta', Sticky.onScrollDelta);

    return Sticky;
});