/**
 * TODO: 
 * - Implement 2D grid
 * - Implement goto when click on the element
 * - Implement start/center/end
 */

(function(namespace) {
    
    namespace.replaceHash = function(newhash) {

        if (!newhash) newhash = "";
        if (newhash !== "" && (''+newhash).charAt(0) !== '#') 
            newhash = '#' + newhash;

        var state = Object.assign({}, history.state, {href: location.origin+location.pathname+newhash});
        history.replaceState(state, '', location.origin+location.pathname+newhash);
    }

})(window);

jQuery.fx.step.scrollTop = function(E) {
    $(this).data("autoscroll-y", true);
    E.elem.scrollTop = E.now;
    $(this).data("autoscroll-y", false);
}; 

jQuery.fx.step.scrollLeft = function(E) {
    $(this).data("autoscroll-x", true);
    E.elem.scrollLeft = E.now;
    $(this).data("autoscroll-x", false);
};

jQuery.event.special.scrolldelta = {

    delegateType: "scroll",
    bindType: "scroll",
    handle: function (event) {

        var handleObj = event.handleObj;
        var targetData = jQuery.data(event.target);

        var ret = null;
        var elem = event.target;

        if (targetData.elastic && targetData.interval === undefined) {

            targetData.eventListener = elem.addEventListener('scrolldelta.sticky:holding', function (e) {

                if(event.scrollT === undefined) {

                    targetData.time0 = {
                        top   :new Date().getTime(), 
                        left  :new Date().getTime(), 
                        right :new Date().getTime(),
                        bottom:new Date().getTime() 
                    };

                    targetData.time  = targetData.time || targetData.time0;
                }

                var targetData = jQuery.data(e.target);
                e = Sticky.compute(e, targetData);
                Sticky.onWheel(e);

                event.type = handleObj.origType;
                ret = handleObj.handler.apply(this, arguments);
                event.type = handleObj.type;

            }, false);

            targetData.interval = setInterval(function () {

                if (targetData.time === undefined || !targetData.elastic)
                    targetData.time = {};

                targetData.time.top     = targetData.topElastic    ? new Date().getTime()    : undefined;
                targetData.time.bottom  = targetData.bottomElastic ? new Date().getTime()    : undefined;
                targetData.time.left    = targetData.leftElastic   ? new Date().getTime()    : undefined;
                targetData.time.right   = targetData.rightElastic  ? new Date().getTime()    : undefined;

                if (targetData.time0 === undefined || !targetData.elastic)
                    targetData.time0 = {};

                targetData.time0.top    = targetData.topElastic    ? targetData.time0.top    : undefined;
                targetData.time0.bottom = targetData.bottomElastic ? targetData.time0.bottom : undefined;
                targetData.time0.left   = targetData.leftElastic   ? targetData.time0.left   : undefined;
                targetData.time0.right  = targetData.rightElastic  ? targetData.time0.right  : undefined;
                
                var eventHolding = new Event('scrolldelta.sticky:holding');
                if(targetData.elastic) elem.dispatchEvent(eventHolding);
                else {

                    if(targetData.eventListener) 
                        elem.removeEventListener(targetData.eventListener);

                    clearInterval(targetData.interval);
                    targetData.interval = undefined;

                    targetData.time0 = undefined;
                    targetData.time  = undefined;
                }

            }, 1000*Sticky.parseDuration(Sticky.get("throttle")));
        }

        targetData.first = true;
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

        //
        // Time control
        "throttle": "250ms"  ,
        "threshold": "5000ms",

        //
        // Manual overscroll detection (browser compatibility, e.g. scroll event missing with Firefox)
        "overscroll": {
            "top":false   ,
            "bottom":false,
            "left":false  ,
            "right":false ,
        },

        "scrollsnap"           : true   ,
        "scrollsnap_throttle"  : "25ms" ,
        "scrollsnap_start"     : "start", //start, center, end
        "scrollsnap_proximity" : 0.01   ,

        "autoscroll": true,
        "autoscroll_speed": 5, // pixel/s
        "autoscroll_easing": "swing",

        "smoothscroll_duration": "300ms",
        "smoothscroll_speed": 0, // pixel/s
        "smoothscroll_easing": "swing",

        // Ease in/out related variables
        // NB: if easein|easeout > 0 => additional margin
        //     else it enters into the element (equiv. negative margin..)
        "easein"      : "100px",
        "easeout"     : "50px" ,
        "easetime"    : "500ms",
        "easedelay"   : "0.5s" ,
        "easethrottle": "100ms"
    };

    Sticky.parseDuration = function(str) { 

        var array = String(str).split(", ");
            array = array.map(function(t) {

                if(String(t).endsWith("ms")) return parseFloat(String(t))/1000;
                return parseFloat(String(t));    
            });

        return Math.max(...array);
    }

    var debug = false;
    var ready = false;
    Sticky.reset = function() {

        var targetData = jQuery.data(document);
        Object.keys(targetData).forEach((key) =>delete targetData[key]);
    }

    Sticky.autoScroll  = function(el = $("body")) { return Sticky.autoScrollX(el) || Sticky.autoScrollY(el); }
    Sticky.autoScrollX = function(el = $("body")) { return $(el).data("autoscroll-x"); }
    Sticky.autoScrollY = function(el = $("body")) { return $(el).data("autoscroll-y"); }

    Sticky.debounce = function(func, wait, immediate) {

        var timeout;

        return function() {

            var context = this, args = arguments;
            var later = function() {

                timeout = null;
                if (!immediate) func.apply(context, args);
            };

            var callNow = immediate && !timeout;
            clearTimeout(timeout);

            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    Sticky.ready = function (options = {}) {

        if("debug" in options)
            debug = options["debug"];

        Sticky.configure(options);
        ready = true;

        if (debug) console.log("Sticky is ready.");
        dispatchEvent(new Event('sticky:ready'));

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

        var targetData = jQuery.data(document);

        var elem = event.target;
        if (elem === window  ) elem = document.documentElement;
        if (elem === document) elem = document.documentElement;
        
        var first  = (Object.keys(targetData).length === 0);
        var top    = targetData.top    || 0;
        var left   = targetData.left   || 0;
        var bottom = targetData.bottom || 0;
        var right  = targetData.right  || 0;

        // Screen & viewport positioning
        targetData.first  = first;

        targetData.vw     = Math.round(Math.min(document.documentElement.clientWidth || 0, window.innerWidth || 0));
        targetData.vh     = Math.round(Math.min(document.documentElement.clientHeight || 0, window.innerHeight || 0));
        targetData.pw     = $(document).width();
        targetData.ph     = $(document).height();
        targetData.width  = elem.clientWidth;
        targetData.height = elem.clientHeight;

        // Scrolling information
        targetData.top    = window.scrollY;
        targetData.bottom = targetData.ph - window.scrollY - targetData.vh;
        targetData.left   = window.scrollX;
        targetData.right  = targetData.pw  - window.scrollX - targetData.vw;

        if(first) {

            top    = targetData.top;
            bottom = targetData.bottom;
            left   = targetData.left;
            right  = targetData.right;
        }

        targetData.topCounter = targetData.topCounter || 0;
        if (targetData.top    == 0 && targetData.top < top)
            targetData.topCounter    = (targetData.top    == 0 && top    > 0 ? targetData.topCounter    + 1 : targetData.topCounter   ) || 0;

        targetData.bottomCounter = targetData.bottomCounter || 0;
        if (targetData.bottom == 0 && targetData.bottom < bottom)
            targetData.bottomCounter = (targetData.bottom == 0 && bottom > 0 ? targetData.bottomCounter + 1 : targetData.bottomCounter) || 0;

        targetData.leftCounter = targetData.leftCounter || 0;
        if (targetData.left   == 0 && targetData.left < left)
            targetData.leftCounter   = (targetData.left   == 0 && left   > 0 ? targetData.leftCounter   + 1 : targetData.leftCounter  ) || 0;

        targetData.rightCounter = targetData.rightCounter || 0;
        if (targetData.right  == 0 && targetData.right < right)
            targetData.rightCounter  = (targetData.right  == 0 && right  > 0 ? targetData.rightCounter  + 1 : targetData.rightCounter ) || 0;

        targetData.bottomElastic = targetData.bottom < 0;
        if(Sticky.get("overscroll").bottom) {
            targetData.bottomElastic = true;
            targetData.bottom = -1;
        }

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

        targetData.rightElastic  = targetData.right < 0;
        if(Sticky.get("overscroll").right) {
            targetData.rightElastic = true;
            targetData.right = -1;
        }

        targetData.elastic = targetData.topElastic || targetData.bottomElastic || targetData.leftElastic || targetData.rightElastic;

        // Timing information
        if (targetData.time0 === undefined || !targetData.elastic)
            targetData.time0 = {};

        targetData.time0.top    = targetData.time0.top    || new Date().getTime();
        targetData.time0.bottom = targetData.time0.bottom || new Date().getTime();
        targetData.time0.left   = targetData.time0.left   || new Date().getTime();
        targetData.time0.right  = targetData.time0.right  || new Date().getTime();

        if (targetData.time === undefined || !targetData.elastic)
            targetData.time = {};

        targetData.time.top     = targetData.time.top     || targetData.time0.top;
        targetData.time.bottom  = targetData.time.bottom  || targetData.time0.bottom;
        targetData.time.left    = targetData.time.left    || targetData.time0.left;
        targetData.time.right   = targetData.time.right   || targetData.time0.right;
        
        var dX = targetData.left  - left;
        var dY = targetData.top - top;
        var dT = {
            top:    Math.abs(targetData.time0.top - targetData.time.top),
            bottom: Math.abs(targetData.time0.bottom - targetData.time.bottom),
            left:   Math.abs(targetData.time0.left - targetData.time.left),
            right:  Math.abs(targetData.time0.right - targetData.time.right)
        };

        // Event summary information
        event.deltaX = dX;
        event.deltaY = dY;
        event.deltaT = dT;
        event.first  = first;
        event.reset  = (
            dX        == 0 && dY       == 0 &&
            dT.top    == 0 && dT.left  == 0 &&
            dT.bottom == 0 && dT.right == 0
        );
        
        event.scrollT = {
            "auto"    : $(elem).data("autoscroll-x") || $(elem).data("autoscroll-y"),
            "delta"   : dT,
            "t0"      : targetData.time0,
            "elastic" : targetData.elastic
        }

        event.screen = {
            "height" : targetData.height,
            "width"  : targetData.width,
            "vh"     : targetData.vh,
            "vw"     : targetData.vw,
        };
        
        event.scrollX = {
            "auto"         : $(elem).data("autoscroll-x"),
            "delta"        : dX,
            "left"         : targetData.left,
            "leftCounter"  : targetData.leftCounter,
            "leftElastic"  : targetData.leftElastic,
            "right"        : targetData.right,
            "rightCounter" : targetData.rightCounter,
            "rightElastic" : targetData.rightElastic
        };

        event.scrollY = {
            "auto"          : $(elem).data("autoscroll-y"),
            "delta"         : dY,
            "top"           : targetData.top,
            "topCounter"    : targetData.topCounter,
            "topElastic"    : targetData.topElastic,
            "bottom"        : targetData.bottom,
            "bottomCounter" : targetData.bottomCounter,
            "bottomElastic" : targetData.bottomElastic,
        };

        return event;
    };

    Sticky.overscrollTop    = function(event) {
        var deltaY = (event.deltaY !== undefined ? event.deltaY : event.originalEvent.deltaY);
        return /*$(window).height() != $(document).height() &&*/ window.scrollY === 0 && deltaY < 0;
    }  
    Sticky.overscrollBottom = function(event) { 
        var deltaY = (event.deltaY !== undefined ? event.deltaY : event.originalEvent.deltaY);
        var vh = Math.round(Math.min(document.documentElement.clientHeight || 0, window.innerHeight || 0));
        return /*$(window).height() != $(document).height() &&*/ Math.ceil(window.scrollY + vh) >= $(document).height() && deltaY > 0;
    }
    Sticky.overscrollLeft   = function(event) { 
        var deltaX = (event.deltaX !== undefined ? event.deltaX : event.originalEvent.deltaX);
        return $(window).width() != $(document).width() && window.scrollX === 0 && deltaX < 0;
    }
    Sticky.overscrollRight  = function(event) { 
        var deltaX = (event.deltaX !== undefined ? event.deltaX : event.originalEvent.deltaX);
        var vw = Math.round(Math.min(document.documentElement.clientWidth || 0, window.innerWidth || 0));
        return /*$(window).width() != $(document).width() &&*/ Math.ceil(window.scrollX + vw) >= $(document).width() && deltaX > 0;
    }

    function getScrollPadding() {

        var style  = window.getComputedStyle($("html")[0]);

        var dict = {};
            dict["top"] = parseInt(style["scroll-padding-top"]);
            dict["left"] = parseInt(style["scroll-padding-left"]);
        
        if(isNaN(dict["top"])) dict["top"] = 0;
        if(isNaN(dict["left"])) dict["left"] = 0;

        return dict;
    }

    var anchorY = 0;
    var currentHash = window.location.hash;

    Sticky.closestToZero = function(numbers)
    {
        if (numbers.length === 0) return undefined;
        
        let closest = 0;
        for(let i = 0; i < numbers.length;i++) {

            let number = numbers[i];
            let absNumber =  Math.abs(number);
            let absClosest = Math.abs(numbers[closest]);
    
            if (absNumber < absClosest) closest = i;
            else if (absNumber === absClosest && numbers[closest] < 0) closest = i;
        }

        return closest;
    }

    Sticky.scrollTo = function(dict, callback = function() {})
    {
        scrollTop = dict["top"] ?? window.scrollY;
        scrollLeft = dict["left"] ?? window.scrollX;

        duration = 1000*Sticky.parseDuration(dict["duration"] ?? 0);
        speed = parseFloat(dict["speed"] ?? 0);

        easing = dict["easing"] ?? "swing";
        if(speed) {

            var distance = scrollTop - window.offsetTop - window.scrollY;
            duration = speed ? 1000*distance/speed : duration;
        }

        if(duration == 0) {

            document.documentElement.scrollTop = scrollTop;
            document.documentElement.scrollLeft = scrollLeft;

            dispatchEvent(new Event('scroll'));
            callback();

        } else {

            $("html, body").animate({scrollTop: scrollTop, scrollLeft:scrollLeft}, duration, easing, function() {

                dispatchEvent(new Event('scroll'));
                callback();
            });
        }
    }

    Sticky.scrollToFirstSnap = function (e, callback = function() {}) { Sticky.scrollTo({top:Sticky.getFirstSnap().offsetTop, left:0, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback); }
    Sticky.getFirstSnap = function (e)
    {
        var magnets = Sticky.getMagnets();
        if(!magnets.length) return window;

        return magnets[0];
    }

    Sticky.scrollToLastSnap = function (e, callback = function() {}) { Sticky.scrollTo({top:Sticky.getLastSnap().offsetTop, left:0, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback); }
    Sticky.getLastSnap = function (e)
    {
        var magnets = Sticky.getMagnets();
        if(!magnets.length) return window;

        return magnets[magnets.length-1];
    }

    Sticky.scrollToSnap = function (e, callback = function() {}) { Sticky.scrollTo({top:Sticky.getSnap().offsetTop, left:0, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback); }
    Sticky.getSnap = function (e)
    {
        var magnets = Sticky.getMagnets();
        if(!magnets.length) return window;

        return magnets[Sticky.closestToZero(magnets.map(function() { return this.offsetTop; }))];
    }

    Sticky.scrollToPreviousSnap = function (e, callback = function() {}) { Sticky.scrollTo({top:Sticky.getPreviousSnap().offsetTop, left:0, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback); }
    Sticky.getPreviousSnap = function (e)
    {
        var magnets = Sticky.getMagnets();
        if(!magnets.length) return window;

        var current = Sticky.closestToZero(magnets.map(function() { return this.offsetTop; }));
        return current > 0 ? magnets[current-1] : magnets[current];
    }

    Sticky.scrollToNextSnap = function (e, callback = function() {}) { Sticky.scrollTo({top:Sticky.getNextSnap().offsetTop, left:0, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback); }
    Sticky.getNextSnap = function(e)
    {
        var magnets = Sticky.getMagnets();
        if(!magnets.length) return window;

        var current = Sticky.closestToZero(magnets.map(function() { return this.offsetTop; }));
        return current < magnets.length-1 ? magnets[current+1] : magnets[current];
    }
    
    var lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    Sticky.onScrollSnap = function (e)
    {
        if(debug) console.log(show,"Sticky magnetic:", scrollSnap, scrollSnapStart, scrollSnapProximity);

        var magnets = Sticky.getMagnets();
        if(!magnets.length) return;

        var scrollSnap = Sticky.get("scrollsnap");
        var scrollSnapStart = Sticky.get("scrollsnap_start");
        var scrollSnapProximity  = Sticky.get("scrollsnap_proximity");

        var currentId     = Sticky.closestToZero(magnets.map(function() { return this.offsetTop-window.scrollY; }));
        var currMagnet = magnets[currentId];

        var st = window.pageYOffset || document.documentElement.scrollTop;
        var roll   = st > lastScrollTop;
        var unroll = st < lastScrollTop;
        lastScrollTop = st <= 0 ? 0 : st;

        var magnet = currMagnet;
        var closestMagnets = magnets.filter(function() { return this.visible > scrollSnapProximity; });
        
        if (roll) {
        
            closestMagnets = closestMagnets.filter(function() { 
                return  this.element.offsetTop  >= window.scrollY && window.scrollY <= this.element.offsetTop  + this.element.offsetHeight - 1 && 
                        this.element.offsetLeft >= window.scrollX && window.scrollX <= this.element.offsetLeft + this.element.offsetWidth  - 1; 
            });

        } else if(unroll) {

            closestMagnets = closestMagnets.filter(function() { 
                return  this.element.offsetTop  <= window.scrollY+window.clientHeight && window.scrollY+window.clientHeight <= this.element.offsetTop  + this.element.offsetHeight - 1 && 
                        this.element.offsetLeft <= window.scrollX+window.clientWidth  && window.scrollX+window.clientWidth  <= this.element.offsetLeft + this.element.offsetWidth  - 1; 
            });
        }
        
        var scrollTo = closestMagnets.length && closestMagnets[0] !== currMagnet;
        if (scrollTo) {

            if (closestMagnets.length) magnet = closestMagnets[0];
            Sticky.scrollTo({top:magnet.offsetTop - getScrollPadding().top, left:magnet.offsetLeft - getScrollPadding().left, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]});

            $(magnets).each((e) => $(magnets[e].element).removeClass("magnet closest"));
            $(magnet.element).addClass("magnet");

            $(closestMagnets).each((e) => $(magnets[e].element).addClass("closest"));
        }

    }

    Sticky.getMagnets = function ()
    {
        return $(".sticky-magnet")
            .sort(function (m1, m2) {
                return m1.offsetTop > m2.offsetTop ? 1 : (m1.offsetTop < m2.offsetTop ?  -1 : 0);
            }).map(function() { 

                var scrollTop     = window.scrollY + getScrollPadding().top;
                var scrollBottom  = window.scrollY + getScrollPadding().top + window.innerHeight
                var offsetTop     = this.offsetTop;
                var offsetBottom  = this.offsetTop + this.offsetHeight;
                var visibleTop    = offsetTop    < scrollTop    ? scrollTop    : offsetTop;
                var visibleBottom = offsetBottom > scrollBottom ? scrollBottom : offsetBottom;
        
                var scrollLeft     = window.scrollX + getScrollPadding().left;
                var scrollRight  = window.scrollX + getScrollPadding().left + window.innerWidth
                var offsetLeft     = this.offsetLeft;
                var offsetRight = this.offsetLeft + this.offsetWidth;
                var visibleLeft    = offsetLeft    < scrollLeft    ? scrollLeft    : offsetLeft;
                var visibleRight = offsetRight > scrollRight ? scrollRight : offsetRight;
        
                var visibleX = (visibleBottom - visibleTop) / this.offsetHeight;
                var visibleY = (visibleRight - visibleLeft) / this.offsetWidth;
                var visible = Math.min(1, Math.max(0, visibleX))*Math.min(1, Math.max(0, visibleY));
                
                return {element: this, offsetTop: this.offsetTop, visible:visible };
            });
    }

    Sticky.onScrollDelta = function (e) {

        if (debug) console.log("Sticky delta scrolling.. ", e.scrollY, e.scrollX, e.scrollT, e.screen);
        $(".sticky-headlines").each(function() {

            var hash = null;
            if(debug) console.log(show,"Sticky headlines:", $(this.querySelectorAll('*[id]')));
            
            var el = $(this.querySelectorAll('*[id]')).filter(function() {

                if(this === $(Settings.identifier)) return false;
                
                return this.offsetTop - getScrollPadding().top - window.scrollY - 1 <= 0;

            }).sort(function (el1, el2) {

                return el1.offsetTop > el2.offsetTop ? -1 
                    : (el1.offsetTop < el2.offsetTop ?  1 : 0);
            });

            if(el.length !== 0) 
                hash = "#" + el[0].getAttribute("id");

            if(e.first || currentHash != hash) {

                $(currentHash).removeClass("highlight");
                $('a[href^=\''+currentHash+'\']').removeClass("highlight");

                if(hash) {
                    $(hash).addClass("highlight");
                    $('a[href^=\''+hash+'\']').addClass("highlight");
                }

                window.replaceHash(hash);
                currentHash = hash;
            }
        });

        // Make sure autoscroll stops when user scroll for the first time
        if(Sticky.autoScroll()) {
    
            $(".sticky-autoscroll").each(function() {

                if($(this).data("autoscroll") != false) {
            
                    $(this).data("autoscroll", false);
                    $(this).stop();
                }
            });
        }    

        $(".sticky-top").each(function() {

            var isAnchor = e.scrollY.top === anchorY;
            if(e.first || isAnchor) {

                $(this).addClass("show");
                $(this).removeAttr("style");

            } else if(e.scrollY.top > this.clientHeight || $(this).hasClass("show")) {

                // Prevent element shaking
                if(Sticky.get("transition") && Sticky.get("transition").indexOf(this) !== -1) return;
                this.addEventListener("transitionstart", function() { Sticky.add("transition", this);    }, {"once": true});
                this.addEventListener("transitionend", function()   { Sticky.remove("transition", this); }, {"once": true});

                // Action element
                if(e.scrollY.delta < 0 && e.scrollY.bottom > 0) {

                    $(this).addClass("show");
                    $(this).removeAttr("style");
                    if(!e.first) $(this).removeClass("skip-transition");
                    
                } else if(e.scrollY.delta > 0){

                    var borderThickness = parseInt($(this).css("border-bottom-width")) + parseInt($(this).css("border-top-width"));
                    $(this).removeClass("show");
                    $(this).css("top", -this.clientHeight-borderThickness);
                    if(e.scrollY.top == e.scrollY.delta && !e.first)
                        $(this).addClass("skip-transition");
                }

            } else { // Smooth transition

                Sticky.remove("transition", this);

                $(this).css("top", Math.min(0,-e.scrollY.top));
                if(e.scrollY.top > 0 && !e.first)
                    $(this).addClass("skip-transition");
            }
        });

        $(".sticky-bottom").each(function() {

            if(e.reset) $(this).removeClass("hint");
            if(e.scrollT.delta.bottom > 1000*Sticky.parseDuration(Sticky.get("threshold"))/4) $(this).addClass("hint");
            else if(e.scrollT.delta.top > 1000*Sticky.parseDuration(Sticky.get("threshold"))/4) $(this).addClass("hint");
            
            if($(this).hasClass("show")) {

                // Action element
                if (e.scrollY.bottom > this.clientHeight || e.scrollT.delta.top > Sticky.parseDuration(Sticky.get("throttle"))) {

                    $(this).removeClass("show");
                    $(this).removeClass("hint");
                    $(this).removeClass("skip-transition");
                    $(this).removeAttr("style");

                } else { // Smooth transition

                    $(this).css("bottom", Math.min(0, -e.scrollY.bottom));
                    if(e.scrollY.bottom > 0) $(this).addClass("skip-transition");
                }

            } else if(e.scrollT.delta.bottom > 1000*Sticky.parseDuration(Sticky.get("threshold"))) {

                $(this).addClass("show");
                $(this).removeAttr("style");
            }
        });

        $(".sticky-widget").each(function() {

            //
            // Initialisation
            if(!e.first) $(this).addClass("skip-transition");
            else {

                $(this).one("transitionend animationend", function() {
                    $(this).addClass("skip-transition");
                });
            }

            //
            // Compute offsets
            var extraOffsetTop = parseInt(this.dataset.stickyOffsetTop) || 0;
            var extraOffsetBottom = parseInt(this.dataset.stickyOffsetBottom) || 0

            var firstChild = this.firstElementChild;
            var offsetTop  = Math.max(parseInt($(this).css("margin-top")), parseInt($(firstChild).css("margin-top")));
                offsetTop += extraOffsetTop;

            $(this).css("top", offsetTop);
            $(this).css("margin-top", offsetTop - extraOffsetTop);
            $(firstChild).css("margin-top", 0);

            var lastChild = this.lastElementChild;
            var offsetBottom  = Math.max(parseInt($(this).css("margin-bottom")), parseInt($(lastChild).css("margin-bottom")));
                offsetBottom -= extraOffsetBottom;

            if(firstChild !== lastChild) {

                $(this).css("margin-bottom", offsetBottom + extraOffsetBottom);
                $(lastChild).css("margin-bottom", 0);
            }
        });

        $(".sticky-easein, .sticky-easeout").each(function(i) {

            //
            // Update transition CSS
            var extraEaseTime  = Sticky.parseDuration(this.dataset.stickyEasetime)  || Sticky.parseDuration(Sticky.get("easetime"))  || -1;
            var extraEaseDelay = Sticky.parseDuration(this.dataset.stickyEasedelay) || Sticky.parseDuration(Sticky.get("easedelay")) || -1;
            
            if(e.first) {

                var transitionProperty = $(this).css("transitionProperty").split(",");
                var transitionDuration = $(this).css("transitionDuration").split(",");
                var transitionDelay    = $(this).css("transitionDelay").split(",");
                
                var opacityIndex = transitionProperty.indexOf("opacity");
                if (opacityIndex < 0) opacityIndex = transitionProperty.indexOf("all");

                var opacityIndex    = (opacityIndex < 0 ? transitionDuration.length : opacityIndex);
                    opacityDuration = (opacityIndex < 0 ? 0 : Sticky.parseDuration(transitionDuration[opacityIndex]));
                    opacityDelay    = (opacityIndex < 0 ? 0 : Sticky.parseDuration(transitionDelay[opacityIndex]));

                transitionDuration[opacityIndex] = (extraEaseTime  < 0 ? opacityDuration : extraEaseTime);
                transitionDelay   [opacityIndex] = (extraEaseDelay < 0 ? opacityDelay    : extraEaseDelay) + i*Sticky.parseDuration(Sticky.get("easethrottle"));

                var transition = [];
                for (var i = 0; i < transitionProperty.length; i++)
                    transition[i] = transitionProperty[i] + " " + 
                                    Sticky.parseDuration(transitionDuration[i])+"s "+
                                    Sticky.parseDuration(transitionDelay[i])+"s";

                $(this).css("transition", transition.join(","));
            }
            
            //
            // Display logic
            var extraEaseIn = this.dataset.stickyEasein;
            if (extraEaseIn === undefined) extraEaseIn = this.dataset.stickyEaseinout;
            if (extraEaseIn === undefined && $(this).hasClass("sticky-easein")) 
                extraEaseIn = Sticky.get("easein");
           
            if(extraEaseIn !== undefined) {
                // ease-in should not be bigger than the size of the element
                extraEaseIn  = parseInt(extraEaseIn);
                if(extraEaseIn < 0) extraEaseIn = Math.max(extraEaseIn, -this.clientHeight);
            }

            var extraEaseOut = this.dataset.stickyEaseout;
            if (extraEaseOut === undefined) extraEaseOut = this.dataset.stickyEaseinout;
            if (extraEaseOut === undefined && $(this).hasClass("sticky-easeout")) 
                extraEaseOut = Sticky.get("easeout");

            if(extraEaseOut !== undefined) {

                // ease-out should not be bigger than the size of the element
                extraEaseOut = parseInt(extraEaseOut);
                if(extraEaseOut < 0) extraEaseOut = Math.max(extraEaseOut, -this.clientHeight);
                
                // ease-in-out should not overlap
                if(Math.sign(extraEaseIn) == Math.sign(extraEaseIn)) {
                    if(extraEaseIn < 0) extraEaseOut = Math.min(extraEaseOut, extraEaseIn);
                    else extraEaseOut = Math.max(extraEaseOut, extraEaseIn);
                }
            }

            // Y = 0 : viewport top = element bottom
            var top    = this.offsetTop                   - (e.scrollY.top+e.screen.vh); 
            // Y = 0 : viewport bottom = element top 
            var bottom = this.offsetTop+this.clientHeight - (e.scrollY.top);
            
            var isBiggerThanViewport = (e.screen.vh < this.clienHeight);
            var show    = $(this).hasClass("show");
            var easeIn  = $(this).hasClass("sticky-easein")  && extraEaseIn !== undefined && !show;
            var easeOut = $(this).hasClass("sticky-easeout") && extraEaseOut !== undefined && show;

            if (easeIn) {

                var isAbove   = top    - extraEaseIn > 0;
                var isBelow   = bottom + extraEaseIn < 0;
                var isBetween = isBiggerThanViewport
                    ? !isAbove && (top    + this.clientHeight + extraEaseIn > 0) &&
                      !isBelow && (bottom - this.clientHeight - extraEaseIn < 0) 
                    : !isAbove && (top    + this.clientHeight + extraEaseIn < 0) &&
                      !isBelow && (bottom - this.clientHeight - extraEaseIn > 0);

                if(debug) console.log(show,"Sticky ease-in:",isAbove,isBelow,isBetween);
                show = (!isAbove && !isBelow);
            
            } else if(e.first) show = true;

            if(easeOut) {

                var isAbove   = top    - extraEaseOut > 0;
                var isBelow   = bottom + extraEaseOut < 0;
                var isBetween = isBiggerThanViewport
                    ? !isAbove && (top    + this.clientHeight + extraEaseOut > 0) &&
                      !isBelow && (bottom - this.clientHeight - extraEaseOut < 0) 
                    : !isAbove && (top    + this.clientHeight + extraEaseOut < 0) &&
                      !isBelow && (bottom - this.clientHeight - extraEaseOut > 0);

                if(debug) console.log(show,"Sticky ease-out:",isAbove,isBelow,isBetween);
                show = !isAbove && !isBelow;
              }

            if(show) $(this).addClass("show");
            else $(this).removeClass("show");
        });
    }

    Sticky.onWheel = function (event) {

        // Overscroll detection
        var overscroll = {top:false, right:false, bottom:false, left:false};
            overscroll.top    = Sticky.overscrollTop(event);
            overscroll.bottom = Sticky.overscrollBottom(event);
            overscroll.left   = Sticky.overscrollLeft(event);
            overscroll.right  = Sticky.overscrollRight(event);

        Sticky.set("overscroll", overscroll);
        if(overscroll.top || overscroll.bottom || overscroll.left || overscroll.right)
            $(document).trigger('scrolldelta.sticky');

        // On stop wheel event
        clearTimeout($.data(this, 'timer'));
        $.data(this, 'timer', setTimeout(() =>  $(document).trigger('scrolldelta.sticky'), 1000*Sticky.parseDuration(Sticky.get("throttle"))));
    };
    
    Sticky.onAutoscroll = function(el) {

        Sticky.scrollTo(
            {top: this.offsetTop-this.offsetHeight, left:0, speed: Sticky.get("autoscroll_speed"), duration: Sticky.get("autoscroll_duration")}, 
            () => Sticky.scrollTo(
                {top: 0, left:0, speed: Sticky.get("autoscroll_speed"), duration: Sticky.get("autoscroll_duration")}, 
                () => Sticky.onAutoscroll(el) 
            )
        );
    }

    Sticky.onLoad = function ()
    {
        Sticky.reset();
        $(window).on('wheel.sticky', Sticky.onWheel);
        $(window).on('scrolldelta.sticky', Sticky.onScrollDelta);
        $(window).blur( () => Sticky.reset());
        $(window).focus(() => Sticky.reset());

        // Sticky top anchor
        $('a[href^="#"]').on('click', function () {

            var anchorElem = $(this.getAttribute("href"));
                anchorY = anchorElem.length ? anchorElem[0].offsetTop - getScrollPadding().top : 0;
        });

        // Sticky magnet control
        if(Sticky.get("scrollsnap"))
        {
            $(".sticky-magnet-first, .sticky-magnet-fast-backward"                    ).on("click", function() { Sticky.scrollToFirstSnap(); });
            $(".sticky-magnet-prev , .sticky-magnet-backward, .sticky-magnet-previous").on("click", function() { Sticky.scrollToPreviousSnap(); });
            $(".sticky-magnet-next , .sticky-magnet-forward"                          ).on("click", function() { Sticky.scrollToNextSnap(); });
            $(".sticky-magnet-last , .sticky-magnet-fast-forward"                     ).on("click", function() { Sticky.scrollToLastSnap(); });
        
            var scrollSnapThrottle = 1000*Sticky.parseDuration(Sticky.get("scrollsnap_throttle") ?? Sticky.get("throttle"));
            $(window).on('scrolldelta.sticky', Sticky.debounce(Sticky.onScrollSnap, scrollSnapThrottle));
        }

        // Sticky autoscroll
        if(Sticky.get("autoscroll"))
            $(".sticky-autoscroll").each(Sticky.onAutoscroll);
    }

    $(window).on("hashchange", (e) => Sticky.reset());
    $(window).on("onbeforeunload", function() {
        Sticky.reset(); 
        $(window).off('wheel.sticky');
        $(window).off('scrolldelta.sticky');
        $('a[href^="#"]').off();
    });

    $(window).on("load", function() {
        Sticky.onLoad();
        $(window).trigger("scroll.sticky");
    });

    
    return Sticky;
});
