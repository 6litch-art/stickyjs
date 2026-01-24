import $ from 'jquery';

// Modern browser: use passive event listeners where appropriate for better performance
jQuery.event.special.touchstart = { setup: function( _, ns, handle ) { this.addEventListener("touchstart", handle, { passive: !ns.includes("noPreventDefault") }); } };
jQuery.event.special.touchmove  = { setup: function( _, ns, handle ) { this.addEventListener("touchmove", handle, { passive: !ns.includes("noPreventDefault") }); } };
jQuery.event.special.wheel      = { setup: function( _, ns, handle ) { this.addEventListener("wheel", handle, { passive: true }); } };
jQuery.event.special.mousewheel = { setup: function( _, ns, handle ) { this.addEventListener("mousewheel", handle, { passive: true }); } };

import './js/sticky.js';
import './css/index.css';