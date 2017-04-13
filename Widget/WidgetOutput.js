/* Copyright © 2015-2016 David Valdman */

var Transform = require('../core/Transform');

var devicePixelRatio = 2 * (window.devicePixelRatio || 1);
var MIN_OPACITY = 0.0001;
var MAX_OPACITY = 0.9999;
var EPSILON = 1e-5;
var zeroArray = [0, 0];

/**
 * Responsible for committing CSS3 properties to the DOM and providing DOM event hooks
 *  from a provided DOM element. Where Surface's API handles inputs from the developer
 *  from within Samsara, ElementOutput handles the DOM interaction layer.
 *
 *
 * @class WidgetOutput
 * @constructor
 * @namespace Core
 * @uses Core.LayoutNode
 * @uses Core.SizeNode
 * @private
 * @param [options] {Object}                Options
 * @param [options.roundToPixel] {Boolean}  Prevents text-blurring if set to true, at the cost to jittery animation
 */
function WidgetOutput(options) {
    options = options || {};
    this._opacityDirty = true;
    this._originDirty = true;
    this._transformDirty = true;
    this._isVisible = true;
    this._roundToPixel = options.roundToPixel || false;
}

function _round(value, unit){
    return (unit === 1)
        ? Math.round(value)
        : Math.round(value * unit) / unit
}

function _formatPropertyTransform(transform, unit) {
  var result = [];

  for (var i = 0; i < 15; i++) {
    if (Math.abs(transform[i]) < EPSILON) {
      transform[i] = 0
    }

    if (i === 12 || i === 13) {
      result.push(_round(transform[i], unit))
    } else {
      result.push(transform[i])
    }
  }

  result.push(transform[15])

  var T = Transform.interpret(result)

  return {
    translationX: T.translate[0],
    translationY: T.translate[1],
    scaleX: T.scale[0],
    scaleY: T.scale[1],
    rotation: T.rotate[0]
  }
}

function _formatPropertyOrigin(element, origin, size, currentOrigin) {
    var currentLeft = currentOrigin[0]
    var currentTop = currentOrigin[1]
    var xPercentage = 100 * origin[0]
    var yPercentage = 100 * origin[1]

    return {
        top:  currentTop - (size[1] * yPercentage / 100),
        left: currentLeft - (size[0] * xPercentage / 100)
    }
}

function _xyNotEquals(a, b) {
    return (a && b) ? (a[0] !== b[0] || a[1] !== b[1]) : a !== b;
}

var _setOrigin =  function _setOrigin(element, origin, size, currentOrigin) {
    // element.set(_formatPropertyOrigin(element, origin, size, currentOrigin))
};

var _setTransform = function _setTransform(element, transform, unit) {
  var transformProperties = _formatPropertyTransform(transform, unit)

  element.set('transform', transformProperties)

};


function _setSize(element, size){
    if (size[0] === true) size[0] = element.get('bounds').width;
    else if (size[0] >= 0) element.set('width', size[0])

    if (size[1] === true) size[1] = element.get('bounds').height;
    else if (size[1] >= 0) element.set('height', size[1])
}

// pointerEvents logic allows for DOM events to pass through the element when invisible
function _setOpacity(element, opacity) {
    if (!this._isVisible && opacity > MIN_OPACITY) {
        element.set('enabled', true)
        this._isVisible = true;
    }

    if (opacity > MAX_OPACITY) opacity = MAX_OPACITY;
    else if (opacity < MIN_OPACITY) {
        opacity = MIN_OPACITY;
        if (this._isVisible) {
            element.set('enabled', false)
            this._isVisible = false;
        }
    }

    element.set('opacity', opacity)
}

WidgetOutput.getWidth = function getWidth(element){
    return element.get('bounds').width
};

WidgetOutput.getHeight = function getHeight(element){
    return element.get('bounds').height
};

WidgetOutput.getSize = function getSize(element){
    return [this.getWidth(element), this.getHeight(element)];
};

WidgetOutput.applyClasses = function applyClasses(element, classList) {
  // element.classList = classList
    // for (var i = 0; i < classList.length; i++)
    //     element.classList.add(classList[i]);
};

WidgetOutput.applyClass = function applyClass(element, className) {
    element.classList.add(className);
};

WidgetOutput.applyProperties = function applyProperties(element, properties) {
    for (var key in properties)
        element.set(key, properties[key])
};


WidgetOutput.removeClass = function removeClasses(element, className) {
    element.classList.remove(className);
};

WidgetOutput.removeClasses = function removeClasses(element, classList) {
    element.classList = classList
};

WidgetOutput.removeProperties = function removeProperties(element, properties) {
    // for (var key in properties)
    //     find the proper way to handle it
    //     element.style[key] = '';
};



WidgetOutput.on = function on(element, type, handler) {
  var event = {
      type: type,
  }

  element.on(type, handler, event);
};

WidgetOutput.off = function off(element, type, handler) {
    element.off(type, handler);
};

WidgetOutput.applyContent = function applyContent(element, content) {
    if (content instanceof tabris.Composite) {
        while (element.children().length) element.children().firstChild().dispose();
        element.append(content);
    } else if (content === undefined) {
      return
    }
    else element.append(content);
};

WidgetOutput.recallContent = function recallContent(element) {
    if(element instanceof tabris.Page) {
      element.close()
    }

    var df = new tabris.Composite()
    while (element.children().length) df.append(element.children());
    return df;
};

WidgetOutput.makeVisible = function makeVisible(element, size){
    element.set('visible', true)

    // for true-sized elements, reset height and width
    if (size){
        if (size[0] === true) element.set('width', null)
        if (size[1] === true) element.set('height', null)
    }
};

WidgetOutput.makeInvisible = function makeInvisible(element){
    element.set('visible', false)

    //Maybe setting visible to false is enough
    element.set('opacity', 0)
    element.set('width', 0)
    element.set('height', 0)

    element.set('transform', {})
};



WidgetOutput.prototype.commitLayout = function commitLayout(element, layout, prevLayout) {
    var transform = layout.transform || Transform.identity;
    var opacity = (layout.opacity === undefined) ? 1 : layout.opacity;
    var origin = layout.origin || zeroArray;

    this._transformDirty = Transform.notEquals(prevLayout.transform, transform);
    this._opacityDirty = this._opacityDirty || (prevLayout.opacity !== opacity);
    this._originDirty = this._originDirty || (prevLayout && _xyNotEquals(prevLayout.origin, origin));

    if (this._opacityDirty) {
        prevLayout.opacity = opacity;
        _setOpacity.call(this, element, opacity);
    }

    if (this._originDirty){
        var currentOrigin = [transform[12], transform[13]]
        prevLayout.origin = origin;
        _setOrigin(element, origin, prevLayout.size, currentOrigin);
    }

    if (this._transformDirty) {
        prevLayout.transform = transform;
        _setTransform(element, transform, this._roundToPixel ? 1 : devicePixelRatio);
    }

    this._originDirty = false;
    this._transformDirty = false;
    this._opacityDirty = false;
};

WidgetOutput.prototype.commitSize = function commitSize(element, size, prevSize){
    if (size[0] !== true) size[0] = _round(size[0], devicePixelRatio);
    if (size[1] !== true) size[1] = _round(size[1], devicePixelRatio);

    if (_xyNotEquals(prevSize, size)){
        _setSize(element, size);
        return true;
    }
    else return false;
};

module.exports = WidgetOutput;
