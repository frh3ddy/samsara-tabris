/* Copyright © 2015-2016 David Valdman */

/**
 * Handles creating, allocating and removing Widget elements within a provided Widget element.
 *  Manages a pool of nodes based on Widget tagName for Widget node reuse.
 *  When a Surface is deallocated, its element is cleared and put back in the pool.
 *  When a Surface is allocated, an existing cleared element of the same tagName is
 *  looked for. If it is not found, a new Widget element is created.
 *
 * @class WidgetAllocator
 * @constructor
 * @namespace Core
 * @private
 * @param container {Node} Widget element
 */
function WidgetAllocator(container) {
    this.set(container);
    this.detachedNodes = {};
}

/**
 * Set containing element to insert allocated content into
 *
 * @method set
 * @param container {Node} Widget element
 */
WidgetAllocator.prototype.set = function(container){
    if (!container) {
        container = new tabris.Composite()
    }
    this.container = container;
};

/**
 * Move the Widget elements from their original container to a new one.
 *
 * @method migrate
 * @param container {Node} Widget element
 */
WidgetAllocator.prototype.migrate = function migrate(container) {
    var oldContainer = this.container;
    if (container.cid === oldContainer.cid) return;

    if (oldContainer.parent() === undefined)
        container.append(oldContainer);
    else {
        while (oldContainer.children().length)
            container.append(oldContainer.children().first());
    }
    this.container = container;
};

/**
 * Allocate an element of specified type from the pool.
 *
 * @method allocate
 * @param type {string} Widget tagName, e.g., "div"
 * @return {Node}
 */
WidgetAllocator.prototype.allocate = function allocate(type, direction) {
    if (!(type in this.detachedNodes)) this.detachedNodes[type] = [];
    var nodeStore = this.detachedNodes[type];
    var result;
    if (nodeStore.length === 0){
        if(direction) {
            result = new tabris[type]({
                opacity: 0,
                direction: direction
            })
        } else {
            result = new tabris[type]({
                opacity: 0
            })
        }

        this.container.append(result);

        // if(type === 'ScrollView') {
        //     var comp1 = new tabris.Composite({width: 100, height: 200, background: 'green'})
        //     result.append(comp1)
        // }
    }
    else result = nodeStore.shift();

    return result
};

/**
 * De-allocate an element of specified type to the pool for recycling.
 *
 * @method deallocate
 * @param element {Node} Widget element
 */
WidgetAllocator.prototype.deallocate = function deallocate(element) {
    element.dispose()
//     var nodeType = element.type;
//     var nodeStore = this.detachedNodes[nodeType];
//     nodeStore.push(element);
};

module.exports = WidgetAllocator;
