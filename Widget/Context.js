/* Copyright © 2015-2016 David Valdman */
// TODO: Enable CSS properties on Context

    var WidgetAllocator = require('./WidgetAllocator');
    var Engine = require('../core/Engine');
    var RootNode = require('../core/nodes/RootNode');
    var Transitionable = require('../core/Transitionable');
    var OptionsManager = require('../core/_OptionsManager');
    var SimpleStream = require('../streams/SimpleStream');
    var EventHandler = require('../events/EventHandler');


    function isSizeType(type) {
        if (type === undefined) return false
        return type.constructor === Array
    }

    /**
     * A Context defines a top-level DOM element inside which other nodes (like Surfaces) are rendered.
     *
     *  The CSS class `samsara-context` is applied, which provides the minimal CSS necessary
     *  to create a performant 3D context (specifically `preserve-3d`).
     *
     *  The Context must be mounted to a DOM node via the `mount` method. If no node is specified
     *  it is mounted to `document.body`.
     *
     *  @example
     *
     *      var context = Context();
     *
     *      var surface = new Surface({
     *          size : [100,100],
     *          properties : {background : 'red'}
     *      });
     *
     *      context.add(surface);
     *      context.mount(document.body)
     *
     * @class Context
     * @constructor
     * @namespace DOM
     * @uses Core.RootNode
     *
     * @param [options] {Object}                        Options
     * @param [options.enableScroll=false] {Boolean}    Allow scrolling on mobile devices
     */
    function Context(options) {
        this.options = OptionsManager.setOptions(this, options, Context.DEFAULT_OPTIONS);
        this._node = new RootNode();
        this._isContextSetup = false

        this.container = null;
        // this._domOutput = new DOMOutput();

        this._size = new SimpleStream();
        this._layout = new SimpleStream();

        this._cachedSize = [];
        this.size = this._size.map(function(type){
            // If `end` event, simply return cache. Otherwise cache busting fails
            // as the `end` size is the same as the `start` size for immediate sets

            if (this.container.type === 'Composite' || 'ScrollView' && isSizeType(type)) {
                const [width, height] = type

                if (width !== this._cachedSize[0] || height !== this._cachedSize[1]){
                    this._cachedSize[0] = width;
                    this._cachedSize[1] = height;
                    this.emit('resize', this._cachedSize);
                    // TODO: shouldn't need to create new array - DOMOutput bug
                    return [width, height];
                }
                else return false;
            }

            if (type === 'end'){
                return this._cachedSize;
            }

            var width = this.container.bounds.width
            var height = this.container.bounds.height

            if (width !== this._cachedSize[0] || height !== this._cachedSize[1]){
                this._cachedSize[0] = width;
                this._cachedSize[1] = height;
                this.emit('resize', this._cachedSize);
                // TODO: shouldn't need to create new array - DOMOutput bug
                return [width, height];
            }
            else return false;
        }.bind(this));


        this._eventOutput = new EventHandler();

        var eventOutput = this._eventOutput
        var touchId = undefined

        this._eventForwarder = function _eventForwarder({event}) {
//             if(this.type === 'touchstart') {
//               touchId = Math.floor((Math.random() * 100) + 1)
//             }

//             var touch = event.touches[0];
//             touch.identifier = touchId

            eventOutput.emit(event);
        }

    }

    Context.prototype.elementClass = 'samsara-context';

    Context.DEFAULT_OPTIONS = {
        enableScroll : false
    };

    /**
     * Extends the render tree beginning with the Context's RootNode with a new node.
     *  Delegates to RootNode's `add` method.
     *
     * @method add
     *
     * @param {Object}          Renderable
     * @return {RenderTreeNode} Wrapped node
     */
    Context.prototype.add = function add() {
        return RootNode.prototype.add.apply(this._node, arguments);
    };

    /**
     * Allocate contents of the `context` to a DOM node.
     *
     * @method mount
     * @param node {Node}  DOM element
     */
    Context.prototype.mount = function mount(node){
        // node = node || window.document.body;

        this.container = node;

        // DOMOutput.applyClass(this.container, this.elementClass);

        var allocator = new WidgetAllocator(this.container);
        this._node.setAllocator(allocator);

        this._node._size.subscribe(this.size);
        this._node._layout.subscribe(this._layout);

        this.emit('deploy', this.container);

        Engine.registerContext(this);
    };

    /**
     * Clear the HTML contents of the Context and remove it from the Render Tree.
     *  The Context can be added to the render tree again and all its data (properties, event listeners, etc)
     *  will be restored.
     *
     * @method remove
     */
    Context.prototype.remove = function remove(){
        // (this.elementClass instanceof Array)
        //     ? DOMOutput.removeClasses(this.container, this.elementClass)
        //     : DOMOutput.removeClass(this.container, this.elementClass);

        this._node.remove();

        //TODO add ability to resurrect content
        DOMOutput.recallContent(this.container);

        Engine.deregisterContext(this);
    };

    /**
     * Adds a handler to the `type` channel which will be executed on `emit`.
     *  These events should be DOM events that occur on the DOM node the
     *  context has been mounted to.
     *
     * @method on
     * @param type {String}         Channel name
     * @param handler {Function}    Callback
     */
    Context.prototype.on = function on(type, handler){
        var event = {
            type: type,
        }
        if (this.container)
            this.container.on(type, this._eventForwarder, event);

        EventHandler.prototype.on.apply(this._eventOutput, arguments);
    };

    /**
     * Removes the `handler` from the `type`.
     *  Undoes the work of `on`.
     *
     * @method off
     * @param type {String}         Channel name
     * @param handler {Function}    Callback
     */
    Context.prototype.off = function off(type, handler) {
        EventHandler.prototype.off.apply(this._eventOutput, arguments);
    };

    /**
     * Used internally when context is subscribed to.
     *
     * @method emit
     * @private
     * @param type {String}     Channel name
     * @param data {Object}     Payload
     */
    Context.prototype.emit = function emit(type, payload) {
        EventHandler.prototype.emit.apply(this._eventOutput, arguments);
    };

    module.exports = Context;
