(function(namespace) {
    
    namespace.replaceHash = function(newHash, triggerHashChange = true, skipIfNoIdentifier = true) {

        if(!newHash) newHash = "";
        if (newHash !== "" && (''+newHash).charAt(0) !== '#') 
            newHash = '#' + newHash;

        var oldURL = location.origin+location.pathname+location.hash;
        var newURL = location.origin+location.pathname+newHash;

        if(skipIfNoIdentifier && $(newHash).length === 0){

            dispatchEvent(new HashChangeEvent("hashfallback", {oldURL:oldURL, newURL:newURL}));
            newHash = "";
        
            oldURL = location.origin+location.pathname+location.hash;
            newURL = location.origin+location.pathname+newHash;
        }

        if(oldURL == newURL) return false;

        var state = Object.assign({}, history.state, {href: newURL});
        history.replaceState(state, '', newURL);
        
        if(triggerHashChange)
            dispatchEvent(new HashChangeEvent("hashchange", {oldURL:oldURL, newURL:newURL}));

        return true;
    }

})(window);

$.fn.isScrollable  = function() { return $(this).isScrollableX() || $(this).isScrollableY(); }
$.fn.isScrollableX = function() { 
    
    return $(this).map(function(i) { 
    
        var el = this[i] === window ? document.documentElement : this[i];
        var hasScrollableContent = el.scrollWidth > el.clientWidth;

        var overflowXStyle = window.getComputedStyle(el).overflowX;
        var isOverflowHidden = overflowXStyle.indexOf('hidden') !== -1;

        return hasScrollableContent && !isOverflowHidden;

    }.bind(this));
}
$.fn.isScrollableY = function() { 
    
    return $(this).map(function(i) { 
    
        var el = this[i] === window ? document.documentElement : this[i];
        var hasScrollableContent = el.scrollHeight > el.clientHeight;

        var overflowYStyle = window.getComputedStyle(el).overflowY;
        var isOverflowHidden = overflowYStyle.indexOf('hidden') !== -1;

        return hasScrollableContent && !isOverflowHidden;

    }.bind(this));
}

$.fn.closestScrollable = function()
{
    return $(this).map((i) => {

        var target = this[i] === window ? document.documentElement : this[i];

        while (target !== document.documentElement) {

            if($(target).isScrollable()[0]) return target;

            if(target.parentElement === undefined) return undefined;
            if(target.parentElement === null) return null;

            target = target.parentElement;
        }
       
        return $(target).isScrollable() ? target : undefined;
    });
}

/* Internal event */
jQuery.event.special.scrolldelta = {

    delegateType: "scroll",
    bindType: "scroll",
    handle: function (event) {

        var handleObj = event.handleObj;

        event = Sticky.compute(event);
        event.type = handleObj.origType;

        var ret    = handleObj.handler.apply(this, arguments);
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
        "tick"  : "1ms"  ,
        "throttle": "250ms"  ,
        "debounce": "1000ms"  ,
        "threshold": "4000ms",

        "scrollcatch": false,
        "scrolllock" : true,
        "scrollhide" : true,
        "scrollhint" : 0.5,
        
        //
        // Manual overscroll detection (browser compatibility, e.g. scroll event missing with Firefox)
        "overscroll": {
            "top":false   ,
            "bottom":false,
            "left":false  ,
            "right":false ,
        },

        "scrollsnap"           : true   ,
        "scrollsnap_start"     : "start", //start, center, end
        "scrollsnap_proximity" : 0.01    ,

        "autoscroll": true,
        "autoscroll_bouncing": false,
        "autoscroll_speed": 5, // pixel/s
        "autoscroll_easing": "swing",

        "smoothscroll_duration": "500ms",
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

    Sticky.remToPixel     = function(rem)     { return parseFloat(rem) * parseFloat(getComputedStyle(document.documentElement).fontSize); }
    Sticky.emToPixel      = function(em, el)  { return parseFloat(em ) * parseFloat(getComputedStyle(el.parentElement).fontSize); }
    Sticky.percentToPixel = function(p , el)  { return parseFloat(p  ) * el.outerWidth(); }
    Sticky.parseToPixel   = function(str, el) { 

        if(str === undefined) return undefined;

        var array = String(str).split(", ");
            array = array.map(function(s) {

                     if(s.endsWith("rem")) return Sticky.remToPixel    (s);
                else if(s.endsWith("em") ) return Sticky.emToPixel     (s, el);
                else if(s.endsWith("%")  ) return Sticky.percentToPixel(s, el);
                return parseFloat(s);
            });

        return Math.max(...array);
    }

    Sticky.getScrollPadding = function(el = document.documentElement) {

        var scroller = $(el).closestScrollable()[0];
        var style  = window.getComputedStyle(scroller);

        var dict = {};
            dict["top"   ] = Sticky.parseToPixel(style["scroll-padding-top"   ] || 0, scroller);
            dict["left"  ] = Sticky.parseToPixel(style["scroll-padding-left"  ] || 0, scroller);
            dict["right" ] = Sticky.parseToPixel(style["scroll-padding-right" ] || 0, scroller);
            dict["bottom"] = Sticky.parseToPixel(style["scroll-padding-bottom"] || 0, scroller);
        
        if(isNaN(dict["top"   ])) dict["top"]    = 0;
        if(isNaN(dict["left"  ])) dict["left"]   = 0;
        if(isNaN(dict["right" ])) dict["right"]  = 0;
        if(isNaN(dict["bottom"])) dict["bottom"] = 0;
        
        return dict;
    }

    var debug = false;
    var ready = false;

    Sticky.epsilon = function(x1, x0) { return Math.abs(x1-x0) < 1; }
    Sticky.reset = function(el = undefined) {

        var targetData = jQuery.data(el || document.documentElement);
        Object.keys(targetData).forEach((key) => delete targetData[key]);
        
        return this;
    }

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
        if (debug) console.log("(padding = ", Sticky.getScrollPadding(), ")");
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
    }

    Sticky.compute = function(event) {

        if (event.target === window  ) 
            event.target = document.documentElement;
        if (event.target === document) 
            event.target = document.documentElement;

        event.target = $(event.target).closestScrollable();
        
        if ($(event.target).prop("user-scroll") === undefined)
            $(event.target).prop("user-scroll", true);
        
        var targetData = jQuery.data(event.target[0]);
        var first  = (Object.keys(targetData).length === 0);

        var top    = targetData.top    || 0;
        var left   = targetData.left   || 0;
        var bottom = targetData.bottom || 0;
        var right  = targetData.right  || 0;

        // Screen & viewport positioning
        targetData.first   = first;
        targetData.elastic = targetData.elastic || false;
        targetData.vw      = $(document.documentElement).innerWidth;
        targetData.vh      = $(document.documentElement).innerHeight;
        targetData.sw      = event.target[0].scrollWidth  || 0;
        targetData.sh      = event.target[0].scrollHeight || 0;
        targetData.width   = event.target[0].clientWidth  || 0;
        targetData.height  = event.target[0].clientHeight || 0;

        // Scrolling information
        targetData.top     = event.target.scrollTop();
        targetData.bottom  = Math.round(targetData.sh - event.target.scrollTop() - targetData.height);
        targetData.left    = event.target.scrollLeft();
        targetData.right   = Math.round(targetData.sw  - event.target.scrollLeft() - targetData.width);

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
        if (targetData.time0 === undefined || !targetData.elastic || targetData.first) {
            targetData.time0 = {};
            targetData.time  = {};
        }

        if(!targetData.topElastic   ) {
            targetData.time0.top    = null;
            targetData.time .top    = null;
        }

        if(!targetData.bottomElastic) {
            targetData.time0.bottom = null;
            targetData.time .bottom = null;
        }

        if(!targetData.leftElastic  ) {
            targetData.time0.left   = null;
            targetData.time .left   = null;
        }

        if(!targetData.rightElastic ) {
            targetData.time0.right  = null;
            targetData.time .right  = null;
        }
        
        if(targetData.topElastic   ) targetData.time0.top    = targetData.time0.top    || new Date().getTime();
        if(targetData.bottomElastic) targetData.time0.bottom = targetData.time0.bottom || new Date().getTime();
        if(targetData.leftElastic  ) targetData.time0.left   = targetData.time0.left   || new Date().getTime();
        if(targetData.rightElastic ) targetData.time0.right  = targetData.time0.right  || new Date().getTime();

        if(targetData.topElastic   ) targetData.time.top     = new Date().getTime();
        if(targetData.bottomElastic) targetData.time.bottom  = new Date().getTime();
        if(targetData.leftElastic  ) targetData.time.left    = new Date().getTime();
        if(targetData.rightElastic ) targetData.time.right   = new Date().getTime();

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
            "delta"   : dT,
            "t0"      : targetData.time0,
            "elastic" : targetData.elastic
        }

        event.screen = {
            "height"    : targetData.height,
            "width"     : targetData.width,
            "vh"        : targetData.vh,
            "vw"        : targetData.vw,
            "userScroll": Sticky.userScroll(event.target)
        };

        event.scrollX = {
            "delta"        : dX,
            "left"         : targetData.left,
            "leftCounter"  : targetData.leftCounter,
            "leftElastic"  : targetData.leftElastic,
            "right"        : targetData.right,
            "rightCounter" : targetData.rightCounter,
            "rightElastic" : targetData.rightElastic
        };

        event.scrollY = {
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

    Sticky.overscrollTop    = function(event, el = window) {
        el = el === window ? document.documentElement : el;
        
        var deltaY = (event.deltaY !== undefined ? event.deltaY : event.originalEvent.deltaY);
        return $(el).scrollTop() === 0 && deltaY < 0;
    }  
    Sticky.overscrollBottom = function(event, el = window) {
        el = el === window ? document.documentElement : el;

        var deltaY = (event.deltaY !== undefined ? event.deltaY : event.originalEvent.deltaY);
        return $(el).scrollTop() >= $(el)[0].scrollHeight - $(el)[0].clientHeight && deltaY > 0;
    }
    Sticky.overscrollLeft   = function(event, el = window) { 
        el = el === window ? document.documentElement : el;

        var deltaX = (event.deltaX !== undefined ? event.deltaX : event.originalEvent.deltaX);       
        return $(el).scrollLeft() === 0 && deltaX < 0;
    }
    Sticky.overscrollRight  = function(event, el = window) { 
        el = el === window ? document.documentElement : el;

        var deltaX = (event.deltaX !== undefined ? event.deltaX : event.originalEvent.deltaX);
        return $(el).scrollLeft() >= $(el)[0].scrollWidth - $(el)[0].clientWidth && deltaX > 0;
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

    Sticky.userScroll = function(el = undefined) { return $(el === undefined ? document.documentElement : el).closestScrollable().prop("user-scroll"); }
    Sticky.scrollTo = function(dict, callback = function() {}, el = window)
    {
        var origin = el;
        if (el === window  ) 
            el = document.documentElement;
        if (el === document) 
            el = document.documentElement;

        var cancelable = dict["cancelable"] ?? false;
        
        if(!Sticky.userScroll(el)) {
            
            if($(el).prop("cancelable")) $(el).stop();
            return;
        }

        $(el).prop("user-scroll", false);
        if(cancelable) {

            $(el).prop("cancelable", true);
            $(el).on("scroll.userscroll mousedown.userscroll wheel.userscroll DOMMouseScroll.userscroll mousewheel.userscroll touchmove.userscroll", function(e) {
                $(this).prop("user-scroll", true);
            });
        }

        scrollTop  = dict["top"] ?? el.scrollTop;
        scrollLeft = dict["left"] ?? el.scrollLeft;

        speed    = parseFloat(dict["speed"] ?? 0);
        easing   = dict["easing"] ?? "swing";
        debounce = dict["debounce"] ?? 0;
        duration = 1000*Sticky.parseDuration(dict["duration"] ?? 0);
        if(speed) {

            var distance = scrollTop - window.offsetTop - window.scrollY;
            duration = speed ? 1000*distance/speed : duration;
        }

        if(duration == 0) {

            $(el).scrollTop = scrollTop;
            $(el).scrollLeft = scrollLeft;

            origin.dispatchEvent(new Event('scroll'));
            callback();

            $(el).prop("user-scroll", true);

        } else {

            $(el).animate({scrollTop: scrollTop, scrollLeft:scrollLeft}, duration, easing, Sticky.debounce(function() {

                if(cancelable)
                    $(el).off("scroll.user mousedown.user wheel.user DOMMouseScroll.user mousewheel.user touchmove.user", () => null);

                origin.dispatchEvent(new Event('scroll'));
                callback();

                $(el).prop("user-scroll", true);

            }, debounce));
        }

        return this;
    }

    Sticky.scrollToFirstSnap = function (el = window, callback = function() {}) 
    { 
        var scroller = $(el).closestScrollable()[0];
        var snap = Sticky.getFirstSnap(el);
        if (snap !== undefined) Sticky.scrollTo({top:snap.offsetTop, left:snap.offsetLeft, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback, scroller); 
    }

    Sticky.getFirstSnap = function (el = window)
    {
        var magnets = Sticky.getMagnets(el);
        if(!magnets.length) return undefined;

        return magnets[0];
    }

    Sticky.scrollToLastSnap = function (el = window, callback = function() {}) { 
        var scroller = $(el).closestScrollable()[0];
        var snap = Sticky.getLastSnap(el);
        if (snap !== undefined) Sticky.scrollTo({top:snap.offsetTop, left:snap.offsetLeft, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback, scroller); 
    }

    Sticky.getLastSnap = function (el = window)
    {
        var magnets = Sticky.getMagnets(el);
        if(!magnets.length) return undefined;

        return magnets[magnets.length-1];
    }

    Sticky.scrollToSnap = function (el = window, callback = function() {}) { 
        var scroller = $(el).closestScrollable()[0];
        var snap = Sticky.getSnap(el);
        if (snap !== undefined) Sticky.scrollTo({top:snap.offsetTop, left:snap.offsetLeft, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback, scroller);
    }
    Sticky.getSnap = function (el = window)
    {
        var magnets = Sticky.getMagnets(el);
        if(!magnets.length) return undefined;

        return magnets[Sticky.closestToZero(magnets.map(function() { return this.offsetTop; }))];
    }

    Sticky.scrollToPreviousSnap = function (el = window, callback = function() {}) {
        var scroller = $(el).closestScrollable()[0];
        var snap = Sticky.getPreviousSnap(el);
        if (snap !== undefined) Sticky.scrollTo({top:snap.offsetTop, left:snap.offsetLeft, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback, scroller);
    }
    Sticky.getPreviousSnap = function (el = window)
    {
        var magnets = Sticky.getMagnets(el);
        if(!magnets.length) return undefined;

        var current = Sticky.closestToZero(magnets.map(function() { return this.offsetTop; }));
        return current > 0 ? magnets[current-1] : magnets[current];
    }

    Sticky.scrollToNextSnap = function (el = window, callback = function() {}) {
        var scroller = $(el).closestScrollable()[0];
        var snap = Sticky.getNextSnap(scroller);
        if (snap !== undefined) Sticky.scrollTo({top:snap.offsetTop, left:snap.offsetLeft, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback, scroller);
    }
    Sticky.getNextSnap = function(el = window)
    {
        var magnets = Sticky.getMagnets(el);

        if(!magnets.length) return undefined;

        var current = Sticky.closestToZero(magnets.map(function() { return this.offsetTop; }));
        return current < magnets.length-1 ? magnets[current+1] : magnets[current];
    }

    var lastScrollTop = window.pageYOffset;
    var scrollSnapDebounce = false;
    Sticky.onScrollSnap = function (e)
    {
        if(debug) console.log(show,"Sticky magnetic:", scrollSnap, scrollSnapStart, scrollSnapProximity);

        var scrollSnap = Sticky.get("scrollsnap");
        if(!scrollSnap) return;

        var scrollSnapStart = Sticky.get("scrollsnap_start");
        var scrollSnapProximity  = Sticky.get("scrollsnap_proximity");

        var magnets = Sticky.getMagnets(e.target);
        if(!magnets.length) return;

        var currentId     = Sticky.closestToZero(magnets.map(function() { return this.offsetTop-window.scrollY; }));
        var currMagnet = magnets[currentId];
        var magnet = currMagnet;
        
        var scroller = $(e.target).closestScrollable()[0];
        if(!e.screen.userScroll) return;

        var st = e.scrollY.top;
        var roll   = st > lastScrollTop;
        var unroll = st < lastScrollTop;
        lastScrollTop = st <= 0 ? 0 : st;

        var magnet = currMagnet;
        var closestMagnets = magnets.filter(function() { return this.visible > scrollSnapProximity; });
        
        if  (roll) closestMagnets = closestMagnets.filter(function() { return this.element.offsetTop                                  >= window.scrollY && this.element.offsetLeft                            >= window.scrollX; });
        else if(unroll) closestMagnets = closestMagnets.filter(function() { return this.element.offsetTop + this.element.offsetHeight >= window.scrollY && this.element.offsetLeft + this.element.offsetWidth >= window.scrollX; }); 

        var scrollTo = closestMagnets.length && closestMagnets[0] !== currMagnet && !scrollSnapDebounce;
        if (scrollTo) {

            if (closestMagnets.length) magnet = closestMagnets[0];
            $(scroller).addClass("sticky-prevent-scroll");

            Sticky.scrollTo({

                top:magnet.offsetTop - Sticky.getScrollPadding(scroller).top, 
                left:magnet.offsetLeft - Sticky.getScrollPadding(scroller).left, 
                easing:Settings["smoothscroll_easing"], 
                duration: Settings["smoothscroll_duration"], 
                speed: Settings["smoothscroll_speed"]
                
            }, function() {

                if(Sticky.get("scrolllock")) {

                    scrollSnapDebounce = true;
                    var scrollLock = setInterval(function() {
            
                        window.scrollTo({
                            top : magnet.offsetTop - Sticky.getScrollPadding(scroller).top,
                            left: magnet.offsetLeft - Sticky.getScrollPadding(scroller).left,
                            behavior: "smooth"
                        });

                    }, 1000*Sticky.parseDuration(Sticky.get("tick")));

                    var scrollDebounce = setTimeout(function() {

                        scrollSnapDebounce = false;

                        $(scroller).removeClass("sticky-prevent-scroll");
                        $(scroller).off('scrolldelta.sticky.snap');

                        clearTimeout(scrollDebounce);
                        clearInterval(scrollLock);

                    }, 1000*Sticky.parseDuration(Sticky.get("debounce")));
                }

            }, scroller);

            $(magnets).each((e) => $(magnets[e].element).removeClass("magnet closest"));
            $(magnet.element).addClass("magnet");

            $(closestMagnets).each((e) => $(magnets[e].element).addClass("closest"));
        }

        return this;
    }

    Sticky.getMagnets = function (el)
    {
        return $(el).find(".sticky-magnet")
            .sort(function (m1, m2) {

                return m1.offsetTop > m2.offsetTop ? 1 : (m1.offsetTop < m2.offsetTop ?  -1 : 0);

            }).map(function() { 

                var scroller = $(this).closestScrollable()[0];
                var scrollTop     = $(scroller).scrollTop() + Sticky.getScrollPadding(scroller).top;
                var scrollBottom  = $(scroller).scrollTop() + Sticky.getScrollPadding(scroller).top + scroller.clientHeight;
                var scrollLeft    = $(scroller).scrollLeft() + Sticky.getScrollPadding(scroller).left;
                var scrollRight   = $(scroller).scrollLeft() + Sticky.getScrollPadding(scroller).left + scroller.clientWidth;

                var offsetTop     = this.offsetTop;
                var offsetBottom  = this.offsetTop + this.clientHeight;
                var offsetLeft    = this.offsetLeft;
                var offsetRight   = this.offsetLeft + this.clientWidth;

                var visibleTop    = offsetTop    < scrollTop    ? scrollTop    : offsetTop;
                var visibleBottom = offsetBottom > scrollBottom ? scrollBottom : offsetBottom;
                var visibleLeft   = offsetLeft    < scrollLeft   ? scrollLeft    : offsetLeft;
                var visibleRight  = offsetRight > scrollRight    ? scrollRight : offsetRight;

                var visibleX = Math.min(1, Math.max(0, (visibleRight - visibleLeft) / scroller.clientWidth ));
                var visibleY = Math.min(1, Math.max(0, (visibleBottom - visibleTop) / scroller.clientHeight));
                var visible  = visibleX * visibleY;

                return {element: this, offsetTop: this.offsetTop, offsetLeft: this.offsetLeft, visible:visible };
            });
    }

    var hasReset = false;
    Sticky.onScrollDelta = function (e) {

        if (debug) console.log("Sticky delta scrolling.. ", e.scrollY, e.scrollX, e.scrollT, e.screen);
        
        $(e.target).find(".sticky-headlines").each(function() {

            var hash = null;
            if(debug) console.log(show,"Sticky headlines:", $(this.querySelectorAll('*[id]')));

            var el = $(this.querySelectorAll('*[id]')).filter(function() {

                if(this === $(Settings.identifier)) return false;
                
                return this.offsetTop - Sticky.getScrollPadding(e.target[0]).top - e.target.scrollTop() - 1 <= 0;

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

                window.replaceHash(hash, false);
                if(Sticky.userScroll(this))
                    dispatchEvent(new HashChangeEvent("hashchange"))

                currentHash = hash;
            }
        });

        $(e.target).find(".sticky-top").each(function() {
            
            var scrollhide = $(this).attr("aria-scrollhide") || Sticky.get("scrollhide");
                scrollhide = scrollhide === "false" ? false : scrollhide;

            var that = this;
            if(scrollhide) {
                
                var isAnchor = Sticky.epsilon(e.scrollY.top, anchorY);
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
            }

            var style = window.getComputedStyle(this);
            var scroller = $(this).closestScrollable()[0];
            var scrollcatchPos = $(this).attr("aria-scrollcatch-pos");
            var scrollcatchClone = $(this).attr("aria-scrollcatch-clone");
                    
            if(style["position"] !== "fixed" && !scrollcatchClone) {
              
                var scrollcatch = $(this).attr("aria-scrollcatch") || Sticky.get("scrollcatch");
                    scrollcatch = scrollcatch === true ? style["z-index"] : scrollcatch;

                    if (scrollcatch !== false && this.offsetTop <= scroller.scrollTop) {

                    var that = $(this).clone().removeAttr("id")
                                      .attr("aria-scrollcatch-clone", true);
    
                    $(this).addClass("caught")
                           .attr("aria-scrollcatch-pos", scroller.scrollTop+1)
                           .attr("aria-labelledby", $(that).uniqueId().attr("id"));

                    $(that).insertBefore($(this).css("position", "fixed").css("z-index", scrollcatch));
                }

            } else if(scrollcatchPos > scroller.scrollTop) {

                var that = $("#"+$(this).attr("aria-labelledby"));
                  $(that).remove();

                $(this).removeClass("caught").css("position", "").css("z-index" , "")
                       .removeAttr("aria-scrollcatch-pos");
            }
        });

        $(e.target).find(".sticky-bottom").each(function() {

            if(!Sticky.get("scrollhide")) return;
            var threshold = 1000*Sticky.parseDuration(Sticky.get("threshold"));
            var scrollHint = Math.min(1, Math.max(0, parseFloat(Sticky.get("scrollhint"))));
            var hasHint = $(this).hasClass("hint");
            
            if(e.reset) hasReset = true;
            if(scrollHint) {

                if(e.scrollY.delta < 0) {
                    $(this).removeClass("hint");
                    $(this).off("click.hint");
                    hasReset = false;
                }
                
                if(e.scrollT.delta.bottom > scrollHint*threshold && !hasHint) {
                    $(this).addClass("hint");
                    $(this).on("click.hint", function() { $(this).removeClass("hint").addClass("show"); });
                    hasReset = false;
                }
            }

            threshold = hasReset && hasHint ? (1-scrollHint) * threshold : threshold;
            if($(this).hasClass("show")) {

                $(this).off("click.hint");

                // Action element
                if (e.scrollY.bottom > this.clientHeight || e.scrollT.delta.top > threshold) {

                    $(this).removeClass("show");
                    $(this).removeClass("hint");
                    $(this).removeClass("skip-transition");
                    $(this).removeAttr("style");

                } else { // Smooth transition

                    $(this).css("bottom", Math.min(0, -e.scrollY.bottom));
                    $(this).css("position", Sticky.get("scrollcatch"));
                    if(e.scrollY.bottom > 0) $(this).addClass("skip-transition");
                }

            } else if(e.scrollT.delta.bottom > threshold) {

                $(this).off("click.hint");
                $(this).addClass("show").removeClass("hint");
                $(this).removeAttr("style");
            }
        });

        $(e.target).find(".sticky-widget").each(function() {

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
            var extraOffsetTop = Math.max(Sticky.parseToPixel(this.dataset.stickyOffsetTop, this), Sticky.getScrollPadding().top) || 0;
            var extraOffsetBottom = Math.max(Sticky.parseToPixel(this.dataset.stickyOffsetBottom, this), Sticky.getScrollPadding().bottom) || 0
            
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

        $(e.target).find(".sticky-easein, .sticky-easeout").each(function(i) {

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

        return this;
    }

    Sticky.onScrollDebounce = function(e) { Sticky.reset(e.target); }
    Sticky.onWheel = function (e) {

        // Overscroll detection
        var overscroll = {top:false, right:false, bottom:false, left:false};
            overscroll.top    = Sticky.overscrollTop(e);
            overscroll.bottom = Sticky.overscrollBottom(e);
            overscroll.left   = Sticky.overscrollLeft(e);
            overscroll.right  = Sticky.overscrollRight(e);

        Sticky.set("overscroll", overscroll);
        if(overscroll.top || overscroll.bottom || overscroll.left || overscroll.right)
            $(e.target).trigger('scrolldelta.sticky');

        return this;
    }

    Sticky.onAutoscroll = function(el) {

        Sticky.scrollTo(
            {top: this.offsetTop-this.offsetHeight, left:0, speed: Sticky.get("autoscroll_speed"), duration: Sticky.get("autoscroll_duration")}, 
            () => Sticky.get("autoscroll_bouncing") ? Sticky.scrollTo(
                {top: 0, left:0, speed: Sticky.get("autoscroll_speed"), duration: Sticky.get("autoscroll_duration")}, 
                () => Sticky.onAutoscroll(el)
            ) : null
        );

        el.one("scroll", function() { 
            
            var userScroll = Sticky.autoScroll(el);
            // Make sure autoscroll stops when user scroll for the first time
            if(Sticky.get("autoscroll") && userScroll) {

                $("html").stop();

                $(".sticky-autoscroll").each(() => $(this).stop());
                $(".sticky-magnet").each(() => $(this).stop());
            }
        });

        return this;
    }

    Sticky.onLoad = function (el = window)
    {
        Sticky.reset(el);

        $(el).on('wheel.sticky', Sticky.onWheel);
        $(el).on('scrolldelta.sticky', Sticky.onScrollDelta);
        $(el).on('scrolldelta.sticky', Sticky.debounce(Sticky.onScrollDebounce, 1000*Sticky.parseDuration(Sticky.get("debounce"))));

        // Sticky top anchor
        $(el === window ? "html" : el).find('a[href^="#"]').on('click', function () {

            var split = this.href.split("#");
            var anchorElem = $(split[1] == "" ? "body" : "#"+split[1]);
                anchorY = anchorElem.length ? anchorElem[0].offsetTop - Sticky.getScrollPadding().top : 0;
        });

        // Sticky magnet control
        if(Sticky.get("scrollsnap"))
        {
            $(".sticky-magnet-first, .sticky-magnet-fast-backward"                    ).on("click", function() { Sticky.scrollToFirstSnap(); });
            $(".sticky-magnet-prev , .sticky-magnet-backward, .sticky-magnet-previous").on("click", function() { Sticky.scrollToPreviousSnap(); });
            $(".sticky-magnet-next , .sticky-magnet-forward"                          ).on("click", function() { Sticky.scrollToNextSnap(); });
            $(".sticky-magnet-last , .sticky-magnet-fast-forward"                     ).on("click", function() { Sticky.scrollToLastSnap(); });
        
            $(el).on('scrolldelta.sticky.snap', Sticky.onScrollSnap);
        }

        // Sticky autoscroll
        if(Sticky.get("autoscroll"))
            $(".sticky-autoscroll").each(Sticky.onAutoscroll);
    
        return this;
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
