(function(namespace) {

    namespace.replaceHash = function(newHash, triggerHashChange = true, skipIfEmptyIdentifier = true) {

        if(!newHash) newHash = "";
        if (newHash !== "" && (''+newHash).charAt(0) !== '#')
            newHash = '#' + newHash;

        var oldURL = location.origin+location.pathname+location.hash;
        var newURL = location.origin+location.pathname+newHash;

        var fallback  = $(newHash).length === 0;

        var hashElement = $(newHash)[0] ?? undefined;
        if (hashElement !== undefined) // Update hash only if element is displayed
            fallback |= window.getComputedStyle(hashElement)["display"] == "none";

        if((skipIfEmptyIdentifier && !newHash) || fallback){

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

$.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
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

$.fn.isScrollable  = function()
{
    for (let el of $(this).isScrollableX())
        if(el) return true;

    for (let el of $(this).isScrollableY())
        if(el) return true;

    return false;
}

$.fn.isScrollableX = function() {

    return $(this).map(function(i) {

        var el = this[i] === window ? document.documentElement : this[i];
        var isDom = el == document.documentElement;

        var hasScrollableContent = el.scrollWidth > el.clientWidth;

        var overflowStyle   = window.getComputedStyle(el).overflowX;
        var isOverflowScroll = overflowStyle.indexOf('scroll') !== -1;

        return hasScrollableContent && (isOverflowScroll || isDom);

    }.bind(this));
}
$.fn.isScrollableY = function() {

    return $(this).map(function(i) {

        var el = this[i] === window ? document.documentElement : this[i];
        var isDom = el == document.documentElement;

        var hasScrollableContent = el.scrollHeight > el.clientHeight;

        var overflowStyle   = window.getComputedStyle(el).overflowY;
        var isOverflowScroll = overflowStyle.indexOf('scroll') !== -1;

        return hasScrollableContent && (isOverflowScroll || isDom);

    }.bind(this));
}

$.fn.closestScrollable = function()
{
    return $(this).map((i) => {

        var target = this[i] === window ? document.documentElement : this[i];
        if (target === undefined) target = document.documentElement;

        while (target !== document.documentElement) {

            if($(target).isScrollable()) return target;

            if(target.parentElement === undefined) return undefined;
            if(target.parentElement === null) return null;

            target = target.parentElement;
        }

        return $(target).isScrollable() ? target : undefined;
    });
}

$.fn.closestScrollableWindow = function()
{
    return $(this).closestScrollable().map(function(i) {

        if (this === document.documentElement)
            return window;
        if (this === document)
            return window;
        if (this === undefined  )
            return window;

        return this;

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
        "debounce": "500ms"  ,
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
        "scrollsnap_proximity" : 0.01   ,

        "swipehint"            : true,
        "swipehint_delay"      : "1s",
        "swipehint_debounce"   : 0,

        "autoscroll": true,
        "autoscroll_bouncing": true,
        "autoscroll_speed": 100, // pixel/s
        "autoscroll_delay": "2s", // pixel/s
        "autoscroll_easing": "linear",
        "autoscroll_minwidth": 200,
        "autoscroll_minheight": 400,
        "autoscroll_startover": true,
        "autoscroll_delay_reverse": "3s",
        "autoscroll_reverse": false,
        "autoscroll_mouse_action": true,

        "smoothscroll_duration": "250ms",
        "smoothscroll_speed": 0, // pixel/s
        "smoothscroll_easing": "swing",

        // Ease in/out related variables
        // NB: if easein|easeout > 0 => additional margin
        //     else it enters into the element (equiv. negative margin..)
        "easein"      : "100px",
        "easeout"     : "50px" ,
        "easetime"    : "250ms",
        "easedelay"   : "250ms",
        "easethrottle": "0ms",

        "ready"       : true,
        "debug"       : false,
        "disable"     : false,
        "replacehash" : true
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

    Sticky.epsilon = function(x1, x0) { return Math.abs(x1-x0) < 1; }
    Sticky.reset = function(el = window) {

        el = el === window ? document.documentElement : el;
        el = $(el).length ? $(el)[0] : undefined;

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
            Settings.debug = options["debug"];

        Sticky.configure(options);
        Settings.ready = true;

        if (Settings.debug) console.log("Sticky is ready.");
        if (Settings.debug) console.log("(padding = ", Sticky.getScrollPadding(), ")");
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

        if (Settings.debug) console.log("Sticky configuration: ", Settings);

        return this;
    }

    Sticky.compute = function(event) {

        if (event.target === undefined  )
            event.target = document.documentElement;
        if (event.target === window  )
            event.target = document.documentElement;
        if (event.target === document)
            event.target = document.documentElement;

        event.target = $(event.target);
        event.target = $(event.target).isScrollable() ? event.target : $(event.target).closestScrollable();
        if(event.target.length == 0) return event;

        if ($(event.target).prop("user-scroll") === undefined)
            $(event.target).prop("user-scroll", true);

        var targetData = jQuery.data(event.target);
        var first  = (Object.keys(targetData).length === 0);

        var top    = targetData.top    || 0;
        var left   = targetData.left   || 0;
        var bottom = targetData.bottom || 0;
        var right  = targetData.right  || 0;

        // Screen & viewport positioning
        targetData.first   = first;
        targetData.elastic = targetData.elastic || false;
        targetData.vw      = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        targetData.vh      = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
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
        event.last  = event.last || 0;
        event.last  = (
            dX        == 0 && dY       == 0 &&
            dT.top    == 0 && dT.left  == 0 &&
            dT.bottom == 0 && dT.right == 0
        ) * (event.last + 1);

        event.reset = event.last < 1;
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
            "userScroll": Sticky.userScroll(event.target) && event.reset
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

    Sticky.closestToZero = function(numbers) { return Sticky.closestTo(0, numbers); }
    Sticky.closestTo = function(x, numbers)
    {
        if (numbers.length === 0) return undefined;

        var min, closest = 0;
        for(let i = 0; i < numbers.length; i++) {

            min = Math.abs(numbers[closest] - x);
            if (Math.abs(numbers[i] - x) < min)
                closest = i;
        }

        return parseInt(closest);
    }

    Sticky.userScroll = function(el = undefined) { return $(el === undefined ? document.documentElement : el).closestScrollable().prop("user-scroll") ?? true; }
    Sticky.scrollTo = function(dict, callback = function() {}, el = window)
    {
        el = $(el).length ? $(el)[0] : window;
        if (el === window  )
            el = document.documentElement;
        if (el === document)
            el = document.documentElement;

        if(Sticky.userScroll(el) == false) return;
        $(el).prop("user-scroll", false);

        var maxScrollX = $(el).prop("scrollWidth") - Math.round($(el).prop("clientWidth"));
        if (maxScrollX == 0) maxScrollX = Math.round($(el).prop("clientWidth"));
        var maxScrollY = $(el).prop("scrollHeight") - Math.round($(el).prop("clientHeight"));
        if (maxScrollY == 0) maxScrollY = Math.round($(el).prop("clientHeight"));

        scrollTop  = Math.max(0, Math.min(dict["top"] ?? $(el).prop("scrollTop"), maxScrollY));
        scrollLeft = Math.max(0, Math.min(dict["left"] ?? $(el).prop("scrollLeft"), maxScrollX));

        speed    = parseFloat(dict["speed"] ?? 0);
        easing   = dict["easing"] ?? "swing";
        debounce = dict["debounce"] ?? 0;

        duration  = 1000*Transparent.parseDuration(dict["duration"] ?? 0);
        durationX = 1000*Transparent.parseDuration(dict["duration-x"] ?? dict["duration"] ?? 0);
        durationY = 1000*Transparent.parseDuration(dict["duration-y"] ?? dict["duration"] ?? 0);

        if(speed) {

            var currentScrollX = $(el)[0].scrollLeft;
            if(currentScrollX < scrollLeft || scrollLeft == 0) // Going to the right
                distanceX = Math.abs(scrollLeft - currentScrollX);
            else // Going back to 0 position
                distanceX = currentScrollX;

            var currentScrollY = $(el)[0].scrollTop;
            if(currentScrollY <= scrollTop || scrollTop == 0) // Going to the right
                distanceY = Math.abs(scrollTop - currentScrollY);
            else // Going back to 0 position
                distanceY = currentScrollY;

            durationX = speed ? 1000*distanceX/speed : durationX;
            durationY = speed ? 1000*distanceY/speed : durationY;
            duration = durationX+durationY;
        }

        var callbackWrapper = function() {

            el.dispatchEvent(new Event('scroll'));
            callback();

            $(el).prop("user-scroll", true);
        };

        if(duration == 0) {

            el.scrollTo(scrollLeft, scrollTop);
            callbackWrapper();

        } else {

            $(el).animate({scrollTop: scrollTop}, durationY, easing,
                () => $(el).animate({scrollLeft: scrollLeft}, durationX, easing, Transparent.debounce(callbackWrapper, debounce))
            );
        }

        return this;
    }

    Sticky.scrollToFirstSnap = function (el = window, callback = function() {})
    {
        var scroller = $(el).closestScrollable()[0];
        var snap = Sticky.getFirstSnap(scroller);
        if (snap !== undefined) Sticky.scrollTo({top:snap.offsetTop, left:snap.offsetLeft, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback, scroller);
        else Sticky.scrollTo({top:0, left:0, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback, scroller);
    }

    Sticky.getFirstSnap = function (el = window)
    {
        var magnets = Sticky.getMagnets(el);
        if(!magnets.length) return undefined;

        return magnets[0];
    }

    Sticky.scrollToLastSnap = function (el = window, callback = function() {}) {
        var scroller = $(el).closestScrollable()[0];
        var snap = Sticky.getLastSnap(scroller);
        if (snap !== undefined) Sticky.scrollTo({top:snap.offsetTop, left:snap.offsetLeft, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback, scroller);
        else Sticky.scrollTo({top:scroller.scrollHeight || document.documentElement.scrollHeight, left:scroller.scrollWidth || document.documentElement.scrollWidth, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback, scroller);
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

        return magnets[Sticky.closestTo(el.scrollTop || el.scrollY, magnets.map(function() { return this.offsetTop; }))];
    }

    Sticky.scrollToPreviousSnap = function (el = window, callback = function() {}) {
        var scroller = $(el).closestScrollable()[0];
        var snap = Sticky.getPreviousSnap(scroller);
        if (snap !== undefined) Sticky.scrollTo({top:snap.offsetTop, left:snap.offsetLeft, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback, scroller);
    }
    Sticky.getPreviousSnap = function (el = window)
    {
        var magnets = Sticky.getMagnets(el);
        if(!magnets.length) return undefined;

        var current = Sticky.closestTo(el.scrollTop || el.scrollY, magnets.map(function() { return this.offsetTop; }));
        return current > 0 ? magnets[current-1] : magnets[current];
    }

    Sticky.scrollToNextSnap = function (el = window, callback = function() {}) {

        var scroller = $(el).closestScrollable()[0];
        var snap = Sticky.getNextSnap(scroller);
        if (snap !== undefined) Sticky.scrollTo({top:snap.offsetTop, left:snap.offsetLeft, easing:Settings["smoothscroll_easing"],  duration: Settings["smoothscroll_duration"], speed: Settings["smoothscroll_speed"]}, callback, scroller);
    }

    scrollState = {};
    Sticky.allowScrolling = function(el = window)
    {
        return el in scrollState ? scrollState[el] || true : true;
    }

    Sticky.enableScroll = function(el = window) {

        // left: 37, up: 38, right: 39, down: 40,
        // spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
        var keys = {37: 1, 38: 1, 39: 1, 40: 1};

        function preventDefault(e) { e.preventDefault(); }
        function preventDefaultForScrollKeys(e) {
            if (keys[e.keyCode]) {
                preventDefault(e);
                return false;
            }
        }

        // modern Chrome requires { passive: false } when adding event
        var supportsPassive = false;
        try {
        window.addEventListener("test", null, Object.defineProperty({}, 'passive', {
            get: function () { supportsPassive = true; }
        }));
        } catch(e) {}

        var wheelOpt = supportsPassive ? { passive: false } : false;
        var wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel.preventDefault' : 'mousewheel.preventDefault';

        el.addEventListener('DOMMouseScroll', preventDefault, false); // older FF
        el.addEventListener(wheelEvent, preventDefault, wheelOpt); // modern desktop
        el.addEventListener('touchmove.preventDefault', preventDefault, wheelOpt); // mobile
        el.addEventListener('keydown.preventDefault', preventDefaultForScrollKeys, false);
        scrollState[el] = true;
    }

    Sticky.disableScroll = function(el = window) {

        // left: 37, up: 38, right: 39, down: 40,
        // spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
        var keys = {37: 1, 38: 1, 39: 1, 40: 1};

        function preventDefault(e) { e.preventDefault(); }
        function preventDefaultForScrollKeys(e) {
            if (keys[e.keyCode]) {
                preventDefault(e);
                return false;
            }
        }

        // modern Chrome requires { passive: false } when adding event
        var supportsPassive = false;
        try {
        window.addEventListener("test", null, Object.defineProperty({}, 'passive', {
            get: function () { supportsPassive = true; }
        }));
        } catch(e) {}

        var wheelOpt = supportsPassive ? { passive: false } : false;
        var wheelEvent = 'onwheel' in document.createElement('div') ? 'wheel.preventDefault' : 'mousewheel.preventDefault';

        el.removeEventListener('DOMMouseScroll.preventDefault', preventDefault, false);
        el.removeEventListener(wheelEvent, preventDefault, wheelOpt);
        el.removeEventListener('touchmove.preventDefault', preventDefault, wheelOpt);
        el.removeEventListener('keydown.preventDefault', preventDefaultForScrollKeys, false);

        scrollState[el] = false;
    }

    Sticky.getNextSnap = function(el = window)
    {
        var magnets = Sticky.getMagnets(el);
        if(!magnets.length) return undefined;

        var current = Sticky.closestTo(el.scrollTop || el.scrollY, magnets.map(function() { return this.offsetTop; }));
        return current < magnets.length-1 ? magnets[current+1] : magnets[current];
    }

    var lastScrollTop = window.pageYOffset;
    var scrollSnapDebounce = false;
    Sticky.onScrollSnap = function (e)
    {
        if (Settings.debug) console.log(show,"Sticky magnetic:", scrollSnap, scrollSnapStart, scrollSnapProximity);
        if(!Settings.ready) return;

        var scrollSnap = Sticky.get("scrollsnap");
        if(!scrollSnap) return;

        var scrollSnapStart = Sticky.get("scrollsnap_start");
        var scrollSnapProximity  = Sticky.get("scrollsnap_proximity");

        var magnets = Sticky.getMagnets(e.target);
        if(!magnets.length) return;

        var currentId  = Sticky.closestToZero(magnets.map(function() { return this.offsetTop-window.scrollY; }));
        var currMagnet = magnets[currentId];
        var magnet     = currMagnet;

        var scroller = $(e.target).closestScrollable()[0];
        if(!e.screen.userScroll || !Sticky.allowScrolling()) return;

        var st = e.scrollY.top;
        var roll   = st > lastScrollTop;
        var unroll = st < lastScrollTop;
        lastScrollTop = st <= 0 ? 0 : st;

        var magnet = currMagnet;
        var closestMagnets = magnets.filter(function() { return this.visible > scrollSnapProximity; });

        if  (roll) closestMagnets = closestMagnets.filter(function() { return this.element.offsetTop                                  >= window.scrollY && this.element.offsetLeft                            >= window.scrollX; });
        else if(unroll) closestMagnets = closestMagnets.filter(function() { return this.element.offsetTop + this.element.offsetHeight >= window.scrollY && this.element.offsetLeft + this.element.offsetWidth >= window.scrollX; });

        var scrollTo = closestMagnets.length && (closestMagnets[0]["element"] ?? undefined) !== currMagnet["element"] && !scrollSnapDebounce && (roll || unroll);
        if (scrollTo) {

            if (closestMagnets.length) magnet = closestMagnets[0];

            $(scroller).addClass("sticky-prevent-scroll");
            if (Sticky.get("scrolllock"))
                Sticky.disableScroll();

            scrollSnapDebounce = true;
            Sticky.scrollTo({

                top:magnet.offsetTop - Sticky.getScrollPadding(scroller).top,
                left:magnet.offsetLeft - Sticky.getScrollPadding(scroller).left,
                easing:Settings["smoothscroll_easing"],
                duration: Settings["smoothscroll_duration"],
                speed: Settings["smoothscroll_speed"]

                }, Sticky.debounce(function() {

                        scrollSnapDebounce = false;
                        $(scroller).removeClass("sticky-prevent-scroll");
                        if (Sticky.get("scrolllock"))
                            Sticky.enableScroll();

                }, 1000*Sticky.parseDuration(Sticky.get("debounce"))), scroller);

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

        if (Sticky.get("disable")) return;
        if (Settings.debug) console.log("Sticky delta scrolling.. ", e.scrollY, e.scrollX, e.scrollT, e.screen);
        if(!Settings.ready) return;

        var magnets = Sticky.getMagnets(e.target);
        if(magnets.length) {

            var currentId  = Sticky.closestToZero(magnets.map(function() { return this.offsetTop-window.scrollY; }));
            if(currentId == 0) $(e.target).find(".sticky-magnet-first").removeClass("show");
            else $(e.target).find(".sticky-magnet-first").addClass("show");

            if(currentId == magnets.length-1) $(e.target).find(".sticky-magnet-last").removeClass("show");
            else $(e.target).find(".sticky-magnet-last").addClass("show");

        } else {

            $(e.target).find(".sticky-magnet-first").hide();
            $(e.target).find(".sticky-magnet-last").hide();
        }

        var scroller = $(this).closestScrollable();
        $(scroller).find(".sticky-top").attr("aria-scrollhide", false);

        function PayloadReplaceHash() {

            if(!Sticky.get("replacehash")) return;
            if(!Settings.ready) return;

            var currentHashEl = $(window.location.hash);
            var ids = $(".sticky-headlines[id], .sticky-headlines [id], .sticky-magnet[id]");
            if (ids.length == 0) return;

            var hash = null;
            if(Settings.debug) console.log(show,"Sticky headlines:", $(ids));

            var elAll = $(ids).filter(function() {

                if(this === $(Settings.identifier)) return false;
                return this.getBoundingClientRect().top < Sticky.getScrollPadding(scroller).top + 1;

            }).sort(function (el1, el2) {

                return el1.offsetTop > el2.offsetTop ? -1
                    : (el1.offsetTop < el2.offsetTop ?  1 : 0);
            });

            var el = elAll.filter(function() {

                if(this === $(Settings.identifier)) return false;
                return this.getBoundingClientRect().top + this.scrollHeight > Sticky.getScrollPadding(scroller).top + 1;
            });

            var currentHashEl = $(window.location.hash)[0];
            var atTop = $(window).scrollTop() < 2;
            var atBottom = $(window).scrollTop() + $(window).height() - $(document).height() > -2;

            if((el.length == 0 && !atTop) || (!elAll.has(currentHashEl) && atBottom)) currentHash = window.location.hash;
            else {

                if(el.length > 0) hash = "#" + el[0].getAttribute("id");

                if(currentHash != hash) {

                    $(currentHash).removeClass("highlight");
                    $('a[href^=\''+currentHash+'\']').removeClass("highlight");

                    if(hash) {
                        $(hash).addClass("highlight");
                        $('a[href^=\''+hash+'\']').addClass("highlight");
                    }

                    if(Sticky.userScroll(el) || $(el).hasClass("sticky-magnet") || (hash == null && elAll.length == 0)) {

                        window.replaceHash(hash, false, false);
                        dispatchEvent(new HashChangeEvent("hashchange"))
                    }

                    currentHash = hash;
                }
            }
        };

        PayloadReplaceHash();

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

                        var borderThickness = parseInt($(this).css("border-bottom-width"))
                                            + parseInt($(this).css("border-top-width"));

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

            if(!e.scrollT.elastic) {

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

                if(Settings.debug) console.log(show,"Sticky ease-in:",isAbove,isBelow,isBetween);
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

                if(Settings.debug) console.log(show,"Sticky ease-out:",isAbove,isBelow,isBetween);
                show = !isAbove && !isBelow;

            }

            if(show) $(this).addClass("show");
            else $(this).removeClass("show");
        });

        return this;
    }

    Sticky.onScrollDebounce = function(e) { Sticky.reset(e.target[0]); }
    Sticky.onWheel = function (e) {

        if(!Settings.ready) return;

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

    Sticky.onAutoscroll = function() {

        if ($(this).data("autoscroll-prevent")) {

            $(this).closestScrollableWindow().off("scrolldelta.autoscroll");
            return;
        }

        var easing = $(this).data("autoscroll-easing");
        if (easing == undefined) easing = Sticky.get("autoscroll_easing");
        var speed = $(this).data("autoscroll-speed");
        if (speed == undefined) speed = Sticky.get("autoscroll_speed");
        var bouncing = $(this).data("autoscroll-bouncing");
        if (bouncing != undefined) bouncing = bouncing ? true : false;
        if (bouncing == undefined) bouncing = Sticky.get("autoscroll_bouncing");

        var startOver = $(this).data("autoscroll-startover");
        if (startOver != undefined) startOver = startOver ? true : false;
        if (startOver == undefined) startOver = Sticky.get("autoscroll_startover");

        var reverse = $(this).data("autoscroll-reverse");
        if (reverse != undefined) reverse = reverse ? true : false;
        if (reverse == undefined) reverse = Sticky.get("autoscroll_reverse");

        var autoscrollX = $(this).data("autoscroll-x");
        if(autoscrollX == undefined) autoscrollX = Sticky.get("autoscroll");
        var autoscrollY = $(this).data("autoscroll-y");
        if(autoscrollY == undefined) autoscrollY = Sticky.get("autoscroll");

        var thresholdMinX = $(this).data("autoscroll-minwidth");
        if(thresholdMinX == undefined) thresholdMinX = Sticky.get("autoscroll_minwidth");
        var thresholdMinY = $(this).data("autoscroll-minheight");
        if(thresholdMinY == undefined) thresholdMinY = Sticky.get("autoscroll_minheight");

        var _onAutoscroll = function() {

            var scrollHeight = $(this).prop('scrollHeight') - $(this).innerHeight();
            var atTop    = $(this).scrollTop() < 1;
            var atBottom = Math.abs($(this).scrollTop() - scrollHeight) < 1;

            var scrollWidth = $(this).prop('scrollWidth') - $(this).innerWidth();
            var atLeft  = $(this).scrollLeft() < 1;
            var atRight = Math.abs($(this).scrollLeft() - scrollWidth) < 1;

            var noScrollY = (atTop && atBottom) || scrollHeight < thresholdMinY;
            var noScrollX = (atLeft && atRight) || scrollWidth  < thresholdMinX;

            if ((noScrollY && noScrollX   ) ||
                (noScrollY && !autoscrollX) ||
                (noScrollX && !autoscrollY) ||
                (!autoscrollX && !autoscrollY)) return;

            if (Settings.debug && !$(this).isScrollable()[0])
                console.error(this, "is not scrollable: autoscroll canceled");

            if(reverse && $(this).scrollLeft() == 0 && $(this).scrollTop() == 0)
                reverse = !reverse;
            else if (!reverse && $(this).scrollLeft() == scrollWidth && $(this).scrollTop() == scrollHeight)
                reverse = !reverse;

            var scrollOptions     = { speed: speed, easing: easing};
            var scrollBackOptions = { speed: speed, easing: easing};

            if(autoscrollY) {
                scrollOptions.top     = noScrollY ? 0 : (reverse ? 0 : scrollHeight);
                scrollBackOptions.top = noScrollY ? 0 : (reverse ? scrollHeight : 0);
            }

            if(autoscrollX) {
                scrollOptions.left     = noScrollX ? 0 : (reverse ? 0 : scrollWidth );
                scrollBackOptions.left = noScrollX ? 0 : (reverse ? scrollWidth  : 0);
            }

            Sticky.scrollTo(scrollOptions, function() {

                if( !bouncing || $(this).data("autoscroll-prevent") ) return;

                $(this).prop("user-scroll", true);
                Sticky.scrollTo(scrollBackOptions, function() {

                    Sticky.onAutoscroll.call(this);
                    if(reverse) $(this).removeData("autoscroll-reverse");
                    else $(this).data("autoscroll-reverse", true);

                }.bind(this), this)

            }.bind(this), this);

            return this;

        }.bind(this);

        return _onAutoscroll();
    }

    Sticky.onLoad = function (el = window)
    {
        if(Sticky.get("disable") === true) {

            $(".sticky").addClass("sticky-disabled");
            return;
        }

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

        if(Sticky.get("swipehint"))
        {
            $(".sticky-swipehint-container").each(function() {

                var image = document.createElement("img");
                    image.src = $(this).data("image");

                var span = document.createElement("span");
                    span.append(image);

                $(this).append(span);
            });

            timeout = setTimeout(() => {

                $(".sticky-swipehint").addClass("sticky-swipehint-reveal");
                $(".sticky-swipehint").on("scroll", function()
                {
                    $(this).removeClass("sticky-swipehint-reveal");
                    var debounceTime = 1000*Sticky.parseDuration(Sticky.get("swipehint_debounce"));
                    if(!debounceTime) return;

                    $(".sticky-swipehint").on('scroll', Sticky.debounce(function() {

                        $(this).addClass("sticky-swipehint-reveal");

                    }, debounceTime));
                });

            }, 1000*Sticky.parseDuration(Sticky.get("swipehint_delay") + 1));
        }

        // Sticky magnet control
        if(Sticky.get("scrollsnap"))
        {
            $(".sticky-magnet-first").on("click", function() { Sticky.scrollToFirstSnap(); });
            $(".sticky-magnet-prev" ).on("click", function() { Sticky.scrollToPreviousSnap(); });
            $(".sticky-magnet-next" ).on("click", function() { Sticky.scrollToNextSnap(); });
            $(".sticky-magnet-last" ).on("click", function() { Sticky.scrollToLastSnap(); });

            $(el).on('scrolldelta.sticky.snap', Sticky.onScrollSnap);
        }

        // Sticky autoscroll
        if(Sticky.get("autoscroll"))

            $(".sticky-autoscroll").each(function() {

                var scroller = $(this).closestScrollable();

                var reverseDelay = $(scroller).data("autoscroll-delay-reverse");
                if (reverseDelay == undefined) reverseDelay = Sticky.get("autoscroll_delay_reverse");
                var reverseSpeed = $(scroller).data("autoscroll-speed-reverse");
                if (reverseSpeed == undefined) reverseSpeed = Sticky.get("autoscroll_speed_reverse");
                var reverseDuration = $(scroller).data("autoscroll-duration-reverse");
                if (reverseDuration == undefined) reverseDuration = Sticky.get("autoscroll_duration_reverse");

                var startOver = $(scroller).data("autoscroll-startover");
                if (startOver == undefined) startOver = Sticky.get("autoscroll_startover");

                var delay = $(scroller).data("autoscroll-delay");
                if (delay == undefined) delay = Sticky.get("autoscroll_delay");

                var thresholdMinX = $(scroller).data("autoscroll-minwidth");
                if(thresholdMinX == undefined) thresholdMinX = Sticky.get("autoscroll_minwidth");
                var thresholdMinY = $(scroller).data("autoscroll-minheight");
                if(thresholdMinY == undefined) thresholdMinY = Sticky.get("autoscroll_minheight");

                var scrollHeight = $(scroller).prop('scrollHeight') - $(scroller).innerHeight();
                var atTop    = $(scroller).scrollTop() < 1;
                var atBottom = Math.abs($(scroller).scrollTop() - scrollHeight) < 1;

                var scrollWidth = $(scroller).prop('scrollWidth') - $(scroller).innerWidth();
                var atLeft  = $(scroller).scrollLeft() < 1;
                var atRight = Math.abs($(scroller).scrollLeft() - scrollWidth) < 1;

                var mouseAction = $(scroller).data("autoscroll-mouse-action");
                if (mouseAction == undefined) mouseAction = Sticky.get("autoscroll_mouse_action");

                var noScrollY = (atTop && atBottom) || scrollHeight < thresholdMinY;
                var noScrollX = (atLeft && atRight) || scrollWidth  < thresholdMinX;

                $(scroller).data("autoscroll-prevent", false);

                var autoscrollTimeout = undefined;
                var payloadAutoscroll = function() {

                    if(autoscrollTimeout != undefined) clearTimeout(autoscrollTimeout);
                    autoscrollTimeout = setTimeout(() => Sticky.onAutoscroll.call(scroller), 1000*Sticky.parseDuration(delay) + 1);
                };

                //
                // Mouse events
                if (mouseAction) {

                    $(scroller).on("mouseenter.autoscroll touchstart.autoscroll", function() {

                        if(autoscrollTimeout != undefined) clearTimeout(autoscrollTimeout);
                        $(scroller).prop("user-scroll", true);
                        $(scroller).stop();
                    });

                    $(scroller).on("mouseleave.autoscroll touchend.autoscroll", function() {

                        if(startOver) payloadAutoscroll();
                        else {

                            $(scroller).data("autoscroll-prevent", "true");
                            $(scroller).off("mouseleave.autoscroll touchend.autoscroll");
                        }
                    });

                    $(scroller).on("onbeforeunload.autoscroll", function() {

                        $(this).off("mousewheel.autoscroll touchstart.autoscroll");
                        $(this).off("mouseenter.autoscroll touchstart.autoscroll");
                        $(this).off("mouseleave.autoscroll touchend.autoscroll");
                        $(this).off("scroll.autoscroll");
                        $(this).off("onbeforeunload.autoscroll");

                        var scrollerWindow = $(this).closestScrollableWindow();
                        $(scrollerWindow).off("scroll.autoscroll");
                    });
                }

                //
                // Call action
                if(noScrollY && noScrollX) payloadAutoscroll();
                else if($(scroller).data("autoscroll-reverse")) {

                    var scrollWidth  = $(scroller).prop('scrollWidth')  - scroller.innerWidth();
                    var scrollHeight = $(scroller).prop('scrollHeight') - scroller.innerHeight();

                    $(scroller).on("wheel.autoscroll DOMMouseScroll.autoscroll mousewheel.autoscroll touchstart.autoscroll", function(e) {

                        $(this).prop("user-scroll", true);
                        $(this).stop();
                    });

                    if (Settings.debug) console.log("Autoscroll reverse delay applied is \"" + reverseDelay + "\".");
                    setTimeout(() => Sticky.scrollTo({
                            left:scrollWidth,
                            top:scrollHeight,
                            duration:reverseDuration,
                            speed:reverseSpeed
                    }, payloadAutoscroll, scroller), 1000*Sticky.parseDuration(reverseDelay + 1));

                } else payloadAutoscroll();
            }
        );

        Settings.ready = true;

        return this;
    }

    $(window).on("onbeforeunload", function() {

        Settings.ready = false;
        Sticky.reset();

        $(window).off('wheel.sticky');
        $(window).off('scrolldelta.sticky');
        $(window).off("hashchange");
        $('a[href^="#"]').off();
    });

    $(window).on("DOMContentLoaded", function() {

        Sticky.onLoad();
        $(window).trigger("scroll.sticky");
        $(window).on("hashchange", (e) => Sticky.reset());
    });

    return Sticky;
});
