/* Copyright © 2015-2016 David Valdman */

    var Node = require('./Node');

    /**
     * Encapsulates a stream of size data (size, proportions, margins).
     *  Listens on start/update/end events, batches them, and emits resize events downstream
     *  to descendant size nodes.
     *
     *  Size can be defined with height and width given numerically, but
     *  they can also be:
     *
     *  ```
     *      `undefined` - takes the parent value
     *      `true`      - takes the DOM calculated value
     *      `false`     - value defined by setting an aspect ratio
     *  ```
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
     *      var sizeNode = new SizeNode({
     *          size : [100, undefined],
     *          margins : [50, 50]
     *      });
     *
     *      context.add(sizeNode).add(surface);
     *      context.mount(document.body)
     *
     * @class SizeNode
     * @namespace Core
     * @constructor
     * @private
     * @param sources {Object}                      Object of size sources
     * @param [sources.size] {Stream|Array}         Size source
     * @param [sources.margin] {Stream|Array}       Margin source
     * @param [sources.proportions] {Stream|Array}  Proportions source
     * @param [sources.aspectRatio] {Stream|Number} Aspect ratio source
     */
    function SizeNode(sources) {
        Node.call(this, sources);
    }

    SizeNode.prototype = Object.create(Node.prototype);
    SizeNode.prototype.constructor = SizeNode;

    // Enumeration of types of size properties
    SizeNode.KEYS = {
        size : true,
        proportions : true,
        margins : true,
        aspectRatio : true
    };

    module.exports = SizeNode;
