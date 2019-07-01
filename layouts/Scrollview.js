/* Copyright © 2015-2016 David Valdman */

// This code is still in beta. Documentation forthcoming.

var Transform = require('../core/Transform');
var Transitionable = require('../core/Transitionable');
var View = require('../core/View');
var Stream = require('../streams/Stream');
var Accumulator = require('../streams/Accumulator');
var Differential = require('../streams/Differential');

var SequentialLayout = require('./SequentialLayout');
var ContainerSurface = require('../Widget/ContainerSurface');

var TouchInput = require('../inputs/TouchInput');

var CONSTANTS = {
    DIRECTION: {
        X: 0,
        Y: 1
    }
};

var EDGE = {
    TOP: -1,
    BOTTOM : 1,
    NONE: 0
};

var Scrollview = View.extend({
    defaults: {
        direction: CONSTANTS.DIRECTION.Y,
        scrollbarVisible: true,
        spacing: 0,
        paginated: false,
        pageChangeSpeed: 0.5,
        startPosition: 0,
        marginTop: 0,
        marginBottom: 0,
        clip: true,
        pageTransition: {
            curve : 'spring',
            period : 100,
            damping : 0.8
        },
        edgeTransition: {
            curve: 'spring',
            period: 100,
            damping: 1
        },
    },
    initialize: function (options) {
        this._currentIndex = 0;
        this._previousIndex = 0;
        this.itemOffset = 0;
        this.items = [];
        
        var composite = new tabris.Composite()

        this.layout = new SequentialLayout({
            direction: options.direction,
            spacing: options.spacing,
            offset: options.marginTop
        });

        this.container = new ContainerSurface({
            tagName: 'ScrollView',
            properties: {
                scrollbarVisible: options.scrollbarVisible,
                direction: options.direction
            }
        });

        this.container.on('deploy', function(target) {
            target.append(composite)
        })

        this.layout.on('start', function(payload) {
            if(options.direction === 1) {
                composite.height = payload
            } else {
                composite.width = payload
            }
        })

        this.layout.on('update', function(payload) {
            if(options.direction === 1) {
                composite.height = payload
            } else {
                composite.width = payload
            }
        })

        

        this.container.add(this.layout);
        this.add(this.container);
    },

    getVelocity: function(){
        return this.velocity;
    },
    goTo: function (index, transition, callback) {
        transition = transition || this.options.pageTransition;
        var position = this.itemOffset;
        var i;

        if (index > this._currentIndex && index < this.items.length) {
            for (i = this._currentIndex; i < index; i++)
                position -= this.items[i].getSize()[this.options.direction];
        }
        else if (index < this._currentIndex && index >= 0) {
            for (i = this._currentIndex; i > index; i--)
                position += this.items[i].getSize()[this.options.direction];
        }

        this.spring.halt();
        this.spring.reset(0);
        this.spring.set(Math.ceil(position), transition, callback);
    },
    getCurrentIndex: function(){
        return this._currentIndex;
    },
    addItems: function (items) {
        for (var i = 0; i < items.length; i++)
            this.layout.push(items[i]);

        this.items = items;
    },
    removeItem: function(item) {
        this.layout.unlink(item)
    }
}, CONSTANTS);

function changePage(index) {
    if (index === this._previousIndex) return;
    this.emit('page', index);
    this._previousIndex = index;
}

function handlePagination(velocity){
    var pageChangeSpeed = this.options.pageChangeSpeed;
    var currentLength = this.items[this._currentIndex].getSize()[this.options.direction];

    var backLength = this.itemOffset;
    var forwardLength = this.itemOffset - currentLength;

    var position = this.itemOffset;
    var positionThreshold = currentLength / 2;

    var target;
    if (velocity < 0){
        // moving forward
        target = (position > positionThreshold || velocity < -pageChangeSpeed)
            ? forwardLength
            : backLength;
    }
    else {
        // moving backward
        target = (position < positionThreshold || velocity > pageChangeSpeed)
            ? backLength
            : forwardLength;
    }

    this.options.pageTransition.velocity = velocity;
    this.spring.halt();
    this.spring.reset(-target);
    this.spring.set(0, this.options.pageTransition);
}


module.exports = Scrollview;
