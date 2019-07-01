/* Copyright © 2015-2016 David Valdman */
// TODO: cancel RAF when asleep

var polyfills = require('./polyfills/animationFrame');
var rAF = window.requestAnimationFrame;
var cAF = window.cancelAnimationFrame;

var EventHandler = require('../events/EventHandler');
var postTickQueue = require('./queues/postTickQueue');
var preTickQueue = require('./queues/preTickQueue');
var dirtyQueue = require('./queues/dirtyQueue');
var tickQueue = require('./queues/tickQueue');
var Transform = require('./Transform');
var Timer = require('./Timer');

var rafId = Number.NaN;
var isMobile = true;
var orientation = Number.NaN;
var windowWidth = Number.NaN;
var windowHeight = Number.NaN;

//tabrisJS code related
var toolbarVisible = true

// Listen to window resize events
tabris.device.onOrientationChanged(handleResize)
// tabris.device.on('change:orientation', handleResize)

/**
 * Engine is a singleton object that is required to run a Samsara application.
 *  It is the "heartbeat" of the application, managing the batching of streams
 *  and creating `RootNodes` and `Contexts` to begin render trees.
 *
 *  It also listens and can respond to DOM events on the HTML `<body>` tag
 *  and `window` object. For instance the `resize` event.
 *
 * @class Engine
 * @namespace Core
 * @static
 * @private
 * @uses Core.EventHandler
 */
var Engine = {};

/*
* Emitter for resize events when window resizes
*/
Engine.size = new EventHandler();

/*
 * Emitter for layout events when RAF loop starts
 */
Engine.layout = new EventHandler();

/**
 * Updates by a single frame of the application by looping through all function queues.
 *  This is repeatedly called within a requestAnimationFrame loop until the application
 *  is receiving no layout changes. At this point the requestAnimationFrame will be
 *  canceled until the next change.
 *
 * @private
 * @method step
 */
Engine.step = function step() {
    // browser events and their handlers happen before rendering begins
    while (preTickQueue.length) (preTickQueue.shift())();

    for (var i = 0; i < tickQueue.length; i++) tickQueue[i]();

    // post tick is for resolving larger components from their incoming signals
    while (postTickQueue.length) (postTickQueue.shift())();

    while (dirtyQueue.length) (dirtyQueue.shift())();
};

/**
 * Initiate the Engine's request animation frame loop.
 *
 * @method start
 * @static
 */
Engine.start = function start() {
    Engine.step();
    rafId = rAF(start);
};

/**
 * Stop the Engine's request animation frame loop.
 *
 * @method stop
 * @static
 */
Engine.stop = function() {
    cAF(rafId);
    rafId = Number.NaN;
};

function firstStart(){
    preTickQueue.push(handleResize);
    preTickQueue.push(handleLayout);
    if (isNaN(rafId)) Engine.start();
}

/**
 * Subscribe context to resize events and start the render loop if not running
 *
 * @method registerContext
 * @static
 */
Engine.registerContext = function(context) {
    context._size.subscribe(Engine.size);
    context._layout.subscribe(Engine.layout);

    if (window.Promise) window.Promise.resolve().then(firstStart);
    else rAF(firstStart);
};

/**
 * Unsubscribe context from resize events
 *
 * @method deregisterContext
 * @static
 */
Engine.deregisterContext = function(context){
    context._size.unsubscribe(Engine.size);
    context._layout.unsubscribe(Engine.layout);
};

var isResizing = false;
var resizeDebounceTime = 150; // introduce lag to detect resize end event. see https://github.com/dmvaldman/samsara/issues/49

var resizeEnd = Timer.debounce(function() {
    dirtyQueue.push(function(){
        Engine.size.emit('end', 'end');
        isResizing = false;
    });
}, resizeDebounceTime);

// Emit a resize event if the window's height or width has changed
function handleResize() {

//     if (toolbarVisible) {
//       tabris.ui.set({
//         toolbarVisible: false,
//       })
//       toolbarVisible = false
//     }

    var newHeight = screen.height
    var newWidth = screen.width


    if (newWidth === windowWidth && newHeight === windowHeight)
        return false;

    windowWidth = newWidth;
    windowHeight = newHeight;

    if (!isResizing){
        Engine.size.emit('start');
        isResizing = true;
        resizeEnd();
    }
    else {
        postTickQueue.push(function(){
            Engine.size.emit('update');
            resizeEnd();
        });
    }
}

var layoutSpec = {
    transform : Transform.identity,
    opacity : 1,
    origin : null,
    align : null,
    nextSizeTransform : Transform.identity
};

function handleLayout(){
    Engine.layout.trigger('start', layoutSpec);
    dirtyQueue.push(function(){
        Engine.layout.trigger('end', layoutSpec);
    });
}

module.exports = Engine;
