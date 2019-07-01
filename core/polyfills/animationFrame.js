
var lastTime = 0;
    // Feature check for performance (high-resolution timers)
var hasPerformance = !!(window.performance && window.performance.now);

if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback, element) {
        var currTime = Date.now();
        var timeToCall = Math.max(0, 16 - (currTime - lastTime));
        var id = setTimeout(function() { callback(currTime + timeToCall); }, 
            timeToCall);
        lastTime = currTime + timeToCall;
        return id;
    };
}

if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
        clearTimeout(id); 
    };
}

// Add new wrapper for browsers that don't have performance
if (!hasPerformance) {
    // Store reference to existing rAF and initial startTime
    var rAF = window.requestAnimationFrame,
        startTime = +new Date;

    // Override window rAF to include wrapped callback
    window.requestAnimationFrame = function (callback, element) {
        // Wrap the given callback to pass in performance timestamp
        var wrapped = function (timestamp) {
            // Get performance-style timestamp
            var performanceTimestamp = (timestamp < 1e12) ? timestamp : timestamp - startTime;

            return callback(performanceTimestamp);
        };

        // Call original rAF with wrapped callback
        rAF(wrapped, element);
    }        
}



// (function(){
//     if ("performance" in window == false) {
//         window.performance = {};
//     }

//     if ("now" in window.performance == false){
//         var nowOffset = Date.now();
//         if (performance.timing && performance.timing.navigationStart){
//             nowOffset = performance.timing.navigationStart
//         }
//         window.performance.now = function now(){
//             return Date.now() - nowOffset;
//         }
//     }
// })()

// var rAF, cAF;

// var last = 0
//     , id = 0
//     , queue = []
//     , frameDuration = 1000 / 60

// rAF = function(callback) {
// if(queue.length === 0) {
//     var _now = window.performance.now()
//     , next = Math.max(0, frameDuration - (_now - last))
//     last = next + _now
//     setTimeout(function() {
//     var cp = queue.slice(0)
//     // Clear queue here to prevent
//     // callbacks from appending listeners
//     // to the current frame's queue
//     queue.length = 0
//     for(var i = 0; i < cp.length; i++) {
//         if(!cp[i].cancelled) {
//         try{
//             cp[i].callback(last)
//         } catch(e) {
//             setTimeout(function() { throw e }, 0)
//         }
//         }
//     }
//     }, Math.round(next))
// }
// queue.push({
//     handle: ++id,
//     callback: callback,
//     cancelled: false
// })
// return id
// }

// cAF = function(handle) {
// for(var i = 0; i < queue.length; i++) {
//     if(queue[i].handle === handle) {
//     queue[i].cancelled = true
//     }
// }
// }

// var animationFrame = {
//     requestAnimationFrame: rAF,
//     cancelAnimationFrame: cAF
// };

// module.exports = animationFrame;


