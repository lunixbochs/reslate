/* File: reslate.js
 * Author: lunixbochs (Ryan Hileman)
 * Project: http://github.com/lunixbochs/reslate
 * License (MIT):

Copyright (c) 2013 Ryan Hileman

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/ 

// See README and slate.example.js for usage.
// There are useful comments here "$ symbol declaration",
//             further down under "Slate monkeypatching",
//             pretty far down in "Rect methods",
//             and a bit lower in "Window methods"

/* $ symbol declaration
 *
 * The exposed '$' symbol has two primary functions.
 *
 * 1. All methods and config in this package are exported as properties of $.
 *
 *   Methods:
 *
 *   - $.addNames(obj, callback):
 *          Adds name metadata to all methods of obj.
 *          You can pass an optional `callback(member, name) -> name`
 *          to override resulting names.
 *          Liberal use of this method makes for more readable $.backtrace()s.
 *
 *   - $.backtrace(error):
 *          Logs a call trace, including method names where available.
 *          `error` is an optional Exception or string,
 *          and will be added to the output if present.
 *
 *   - $.chain(op...):
 *          Used internally to wrap slate's chaining mechanism.
 *          If you want to chain, you can just bind any list like this:
 *
 *              slate.bind(key, ['throw 1 resize', $('center', 'top')]);
 *
 *   - $.debug: Enables/silences $.log(...) (all debug messages).
 *
 *   - $.focus(name):
 *          A convenience method allowing you to focus a window by name.
 *
 *   - $.log(...):
 *          Wraps S.log(), toggled by $.debug.
 *          Look in Console.app for the output.
 *
 *
 * 2. $(...) is a convenience function for wrapping Window() methods
 *    inside key bindings
 *
 * For example:
 *      slate.bind('l:shift', $('corner', 'top-left', 3, 2));
 *
 * Is shorthand for:
 *      slate.bind('l:shift', function(win) {
 *          win.corner('top-left', 3, 2);
 *      });
 *
 *
 * The benefit is even more apparent when you want to chain commands:
 *      slate.bind('l:shift;cmd', [$('corner', 'top-left', 3, 2)
 *                                 $('corner', 'top-left', 3, 3)]);
 *
 */
$ = (function() {
    $ = function() {
        var args = _.toArray(arguments);
        var sequence = false;
        var func;
        if (args.length == 1 && _.isArray(args[0])) {
            sequence = true;
        } else {
            func = args.shift();
        }

        function call(win, func, args) {
            try {
                ret = win[func].apply(win, args);
            } finally {
                if (win.isOffscreen())
                    win.rescue();
            }
        }
        function dispatch(win) {
            if (sequence) {
                _.each(args, function(sub) {
                    var func = sub.shift();
                    call(win, func, sub);
                });
            } else {
                call(win, func, args);
            }
        }
        return dispatch;
    };

    function Proxy(parent, keys, base) {
        var proxy = {};
        var _super = {};
        _.each(keys, function(key) {
            var value = parent[key];
            if (_.isFunction(value)) {
                _super[key] = proxy[key] = (function() {
                    var func = value;
                    return function() {
                        return func.apply(parent, arguments);
                    };
                })();
            } else {
                _super[key] = proxy[key] = parent[key];
            }
        });
        $.addNames(base, function(member, key) {
            var parent = base.name;
            if (proxy.title) {
                var title = '"' + proxy.title() + '"';
                if (proxy.app) {
                    var name = proxy.app().name();
                    title = '[' + name + ']: ' + title;
                }
                parent += '(' + title + ')';
            }
            return parent + '.' + key;
        });
        _.extend(proxy, base);
        proxy._super = _super;
        if (proxy.update)
            proxy.update();
        return proxy;
    }

    function ProxyMember() {
        function wrapper() {
            return wrapper._init.apply(wrapper, arguments);
        }
        return wrapper;
    }

    _.extend($, {
        debug: false,
        log: function() {
            if (this.debug) {
                S.log.apply(S, arguments);
            }
        },
        addNames: function(obj, extra) {
            _.each(obj, function(member, key) {
                if (_.isFunction(member)) {
                    if (_.isFunction(extra)) {
                        member._name = extra(member, key);
                    } else {
                        member._name = key + '()';
                    }
                }
            });
        },
        backtrace: function(error) {
            if (error) {
                if (error instanceof Error) {
                    $.log('Error (line ' + error.line + ')  : ' + error);
                } else {
                    $.log('Error: ' + error);
                }
            }
            var stack = [];
            var current = arguments.callee.caller;
            var iterations = 0;
            while (current) {
                iterations++;
                if (iterations > 10) {
                    break; // nope nope nope
                }
                var fn = current;
                var name = fn._name;

                // determine the function name
                if (! name)
                    name = (fn.name || fn);
                var args = JSON.stringify(_.toArray(current.arguments));
                args = args.replace(/^\[/, '(').replace(/]$/, ')');
                var pretty = name + args;
                stack.push(pretty);

                // add a hotkey line to the stacktrace when we get to that point
                if (fn._hotkey) {
                    var key = fn._hotkey;
                    if (_.contains(key, ':')) {
                        var parts = key.split(':');
                        key = parts[0];
                        mods = parts[1].replace(/;/g, '+');
                        if (mods) {
                            key = mods + '-' + key;
                        }
                    }
                    key = key.replace(/\b\S/g, function(a) { return a.toUpperCase(); });
                    stack.push('Hotkey Pressed: "' + key + '"');
                }
                current = current.caller;
            }
            $.log('Backtrace:');
            for (var i = 0; i < stack.length; i++) {
                $.log(' - ' + i + ': ' + stack[i]);
            }
        },
        focus: function(name) {
            name = name.replace('"', '\"');
            return 'focus "' + name + '"';
        },
        chain: function() {
            var ops = [];
            _.each(arguments, function(op) {
                if (_.isString(op)) {
                    op = slate.operationFromString(op);
                }
                if (_.isFunction(op)) {
                    var call = op;
                    op = function(win) {
                        return call($.window(win));
                    };
                }
                ops.push(op);
            });
            return slate.operation('chain', {operations: ops});
        },
        rect: ProxyMember(),
        window: ProxyMember(),
        screen: ProxyMember()
    });

    $.addNames($);

    _.extend($.rect, {
        _keys: ['x', 'y', 'width', 'height'],
        _init: function(rect) {
            if (rect === undefined) {
                $.log('slate.js - warning: offscreen window?');
                rect = {x: 0, y: 0, width: 1, height: 1};
            }
            return Proxy(rect, this._keys, $.rect);
        }
    });

    _.extend($.screen, {
        _keys: ['id', 'rect', 'visibleRect', 'isMain'],
        _init: function(screen) {
            if (screen == undefined) {
                screen = S.screen();
            }
            return Proxy(screen, this._keys, $.screen);
        },
        rect: function() {
            return $.rect(this._super.visibleRect());
        },
        update: function() {
            var _super = this._super;
            _.extend(this, this.rect());
            this._super = _super;
        }
    });

    _.extend($.window, {
        _keys: [
            'title', 'topLeft', 'size', 'rect', 'pid',
            'focus', 'isMinimizedOrHidden', 'isMain',
            'move', 'isMovable', 'resize', 'isResizable',
            'doOperation', 'screen', 'app'
        ],
        _init: function(win) {
            if (win == undefined) {
                win = S.window();
            }
            var keys = 
            win = Proxy(win, this._keys, $.window);
            if (win.isOffscreen())
                win.rescue();
            return win;
        },
        // internals
        rect: function() {
            return $.rect(this._super.rect());
        },
        screen: function() {
            return $.screen(this._super.screen());
        },
        update: function() {
            // make sure to update if you use any internal move/resize ops
            var _super = this._super;
            _.extend(this, this.rect());
            this._super = _super;
        },
        isOffscreen: function() {
            return this.screen().visibleRect() === undefined;
        },
        rescue: function() {
            this.op('throw 0 resize');
            this.op('throw 0 resize');
        },
        op: function(cmd, args) {
            var op;
            if (args === undefined) {
                op = slate.operationFromString(cmd);
            } else {
                op = slate.operation(cmd, args);
            }
            return this.doOperation(op);
        }
    });
    return $;
})();

/* Slate monkeypatching
 *
 * Here, we replace slate commands and add some new ones.
 *
 * slate.alias(alias, modifier):
 *      Binds 'alias' to 'modifier'.
 *
 *      Example:
 *          slate.alias('hyper', 'cmd;alt;shift');
 *          slate.bind('u:hyper', 'throw 0');
 *
 * slate.removeAlias(alias):
 *      Removes a previously created alias.
 *
 * slate.bind(key, operation):
 *      Bind a key to operation(s).
 *
 *      Enhanced as follows:
 *
 *        * Enables 'chain' functionality via array:
 *          slate.bind('a': ['throw 0', 'throw 1']);
 *
 *        * Allows usage of string ops without calling operationFromString()
 *        * Overloads window objects passed to function callbacks.
 *        * Adds backtrace metadata.
 *
 * slate.bindAll(object):
 *      Bind key(s) to operation(s).
 *
 *      Enhanced as follows:
 *        * Allows deeply nested bindings with inherited modifiers:
 *          slate.bind({
 *              hyper: {
 *                  u: 'throw 0',    // hyper+u
 *                  shift: {         // hyper+shift
 *                      u: 'throw 1' // hyper+shift+u
 *                  }
 *              }
 *          });
 *
 */
(function() {
    var windows = {};
    var aliases = {};
    var preHooks = [];
    var postHooks = [];

    function appendModifier(key, modifier) {
        modifier = modifier.replace(':', ';');
        if (key.indexOf(':') !== -1) {
            return key + ';' + modifier;
        } else {
            return key + ':' + modifier;
        }
    }

    function makeCallback(key, op) {
        var func;
        if (_.isArray(op)) {
            var ops = [];
            _.each(op, function(o) {
                o = makeCallback(key, o);
                ops.push(o);
            });
            return $.chain.apply(null, ops);
        } else if (_.isString(op)) {
            var strOp = op;
            func = function(win) {
                win.op(strOp);
            };
        } else if (_.isFunction(op)) {
            func = op;
        } else {
            S.log('unknown op:', op, typeof op);
            return null;
        }

        return function(win) {
            try {
                _.each(preHooks, function(callback) {
                    callback(key, win);
                });
            } catch (e) {
                $.backtrace(e);
                S.log('supressing exception in pre-hook.');
            }
            try {
                return func(win);
            } catch (e) {
                $.backtrace(e);
                throw e;
            } finally {
                try {
                    _.each(postHooks, function(callback) {
                        callback(key, win);
                    });
                } catch (e) {
                    throw e;
                }
            }
        };
    }

    var _bind = slate.bind;
    _.extend(slate, {
        alias: function(alias, mod) {
            aliases[alias] = mod;
        },
        removeAlias: function(alias) {
            delete aliases[alias];
        },
        pre: function(func) {
            preHooks.push(func);
        },
        post: function(func) {
            postHooks.push(func);
        },
        bind: function(key, op) {
            _.each(aliases, function(mod, alias) {
                key = key.replace(alias, mod);
            });
            if (_.isObject(op) && !(_.isArray(op) || _.isFunction(op))) {
                // nested modifiers
                slate.bindAll(op, key);
                return;
            }
            op = makeCallback(key, op);
            if (_.isFunction(op)) {
                function callback(win) {
                    if (win === undefined) {
                        // this won't go well
                        return false;
                    }
                    // reuse proxy objects in callbacks
                    // this means you can store persistent data on a $.window()
                    var pid = win.pid();
                    if (_.has(windows, pid)) {
                        win = _.extend(windows[pid], $.window(win));
                    } else {
                        win = windows[pid] = $.window(win);
                    }
                    return op(win);
                }
                callback._hotkey = key;
                _bind(key, callback);
            } else if (op) {
                _bind(key, op);
            }
        },
        bindAll: function(obj, modifier) {
            _.each(obj, function(op, key) {
                if (modifier !== undefined) {
                    key = appendModifier(key, modifier);
                }
                slate.bind(key, op);
            });
        }
    });
})();

// prototype+extensions

/* Rect methods.
 * Keep in mind 'Window objects' and 'Screen objects'
 * inherit all properties from their rect.
 *
 * rect.bordered(borderSize):
 *      Shrink the rect by a border and return it.
 *
 * rect.left():
 * rect.right():
 * rect.top():
 * rect.bottom():
 *      Read the code below. It's simple wrapping/math.
 *
 * rect.midY():
 *      Returns the rect's vertical center.
 *
 * rect.midX():
 *      Returns the rect's horizontal center.
 *      
 */
_.extend($.rect, {
    bordered: function(border) {
        this.x += border / 2;
        this.y += border / 2;
        this.width -= border;
        this.height -= border;
        return this;
    },
    left: function() {
        return this.x;
    },
    right: function() {
        return this.x + this.width;
    },
    top: function() {
        return this.y;
    },
    bottom: function() {
        return this.y + this.height;
    },
    midY: function() {
        return this.y + (this.height / 2);
    },
    midX: function() {
        return this.x + (this.width / 2);
    }
});

/* Window methods
 *
 * A few standard methods are replaced, and some operations
 * are completely replaced with very similar object methods.
 *
 * window.barResize(dir, div, pos):
 *      Turns a window into a full-height or width bar across the screen,
 *      and pushes it to an edge.
 *
 *      @dir = (left, right, top, bottom)
 *      @div (default=2) resizes the perpindicular side,
 *      with size based on the corresponding screen dimension
 *      @pos (default=0) can be used to place the resulting bar
 *      somewhere in the middle of the screen.
 *
 * window.center(dir, horiz, vert):
 *      Centers a window in direction, optionally changing the dimensions
 *      by a screen division horizontally/vertically.
 *
 *      @dir: Pick one of the following:
 *          1. any combination of (top, left, right, bottom).
 *          2. one of "horiz", "vert", 'center"
 *          Valid choices include (but aren't limited to):
 *              "left", "top-left", "right", "bottom-right", "center", "horiz"
 *
 *      @horiz, @vert (optional): see window.divResize() for details
 *      (You must provide both @horiz and @vert for the resize to take place).
 *
 * window.corner(dir, horiz, vert):
 *      Places a window in a corner, resizing by horiz and vert.
 *
 *      @corner: Pick from:
 *          "top-left", "top-right", "bottom-left", "bottom-right"
 *
 *      @horiz, @vert (optional): see window.divResize() for details
 *
 * window.divResize(horiz, vert):
 *      Resizes a window by dividing the current screen.
 *
 *      @horiz (default=1): width  = screen.width  / @horiz
 *      @vert  (default=1): height = screen.height / @vert
 *  
 * window.move(args):
 *      Moves a window to args.x, args.y.
 *
 *      Better than default .move() in the following ways:
 *        * Logs calls.
 *        * Refuses bogus coordinates, which can:
 *            * Crash Slate.
 *            * Lose your window into the ether.
 *        * Updates rect properties on the window (x, y, width, height).
 *
 * window.push(dir):
 *      Alias for window.snap(dir).
 *
 * window.resize(args):
 *      Resizes a window to args.width, args.height.
 *
 *      Better than the default .resize() in the following ways:
 *        * Logs calls.
 *        * Refuses bogus width/height.
 *        * Guaranteed to end up <= your specified size, even in Terminal.app.
 *        * Won't get confused if the Window is in a weird position.
 *        * Updates rect properties on the window.
 *
 * window.snap(dir):
 *      Snaps a window to a direction, with slight bias
 *      to the top left of the screen for consistency.
 *
 *      @dir: any combination of "left", "top", "right", "bottom"
 *      Examples: "left", "top-left", "left-top", "bottom", "bottom-right"
 *
 * window.throw(screen, resize):
 *      Aliased to 'toss'. Throw is a reserved keyword in JS.
 *
 * window.toss(screen, resize):
 *      Throws a window to a screen, resizing if desired.
 *
 *      Advantages over default 'throw':
 *        * Resize consistently works the first time.
 *        * Better resize heuristics.
 */
_.extend($.window, {
    barResize: function(dir, div, pos) {
        div = (div || 2);
        // TODO: pos has been unimplemented
        pos = (pos || 0);
        var s = this.screen();
        if (dir == 'left' || dir == 'right') {
            this.divResize(div, 1);
            this.snap(dir);
        } else if (dir == 'top' || dir == 'bottom') {
            this.divResize(1, div);
            this.snap(dir);
        }
    },
    center: function(dir, horiz, vert) {
        $.log('center', dir, horiz, vert);
        if (horiz && vert)
            this.divResize(horiz, vert);
        var s = this.screen();
        var width, height;
        var x = this.x;
        var y = this.y;
        if (dir == 'left' || dir == 'right') {
            this.center('vert');
            this.snap(dir);
        } else if (dir == 'top' || dir == 'bottom') {
            this.center('horiz');
            this.snap(dir);
        } else if (dir == 'center') {
            this.center('horiz');
            this.center('vert');
        } else if (dir == 'horiz') {
            width = this.width;
            x = s.midX() - (width / 2);
            this.move({x: x, y: y});
        } else if (dir == 'vert') {
            height = this.height;
            y = s.midY() - (height / 2);
            this.move({x: x, y: y});
        } else {
            return;
        }
    },
    corner: function(corner, horiz, vert) {
        $.log('corner', JSON.stringify([corner, horiz, vert]));
        this.divResize(horiz || 2, vert || 2);
        this.snap(corner);
    },
    divResize: function(horiz, vert) {
        var s = this.screen();
        var width = s.width / (horiz || 1);
        var height = s.height / (vert || 1);
        this.resize({width: width, height: height});
    },
    move: function(args) {
        // TODO: also allow calling with (x, y)
        $.log('move', JSON.stringify(args));
        var x = args.x;
        var y = args.y;
        if ((x !== 0 && !x) || (y !== 0 && !y)) {
            $.backtrace('Invalid move destination.');
            return;
        }
        this._super.move(args);
        this.update();
    },
    push: function(dir) {
        this.snap(dir);
    },
    resize: function(args) {
        // TODO: allow calling with (width, height)
        $.log('resize', JSON.stringify(args));
        var width = args.width;
        var height = args.height;
        if ((width !== 0 && !width || width < 0) ||
            (height !== 0 && !height || height < 0)) {
            $.backtrace('Invalid resize.');
            return;
        }

        var s = this.screen();
        // give ourselves enough room to resize
        var x = Math.min(this.x, s.right() - width);
        var y = Math.min(this.y, s.bottom() - height);
        this.move({x: x, y: y});
        this._super.resize(args);
        while (this.rect().height > height + 1) {
            args.height -= 1;
            if (args.height < 0)
                break;
            this._super.resize(args);
        }
        while (this.rect().width > width + 1) {
            args.width -= 1;
            if (args.width < 0)
                break;
            this._super.resize(args);
        }
        this.update();
    },
    snap: function(dir) {
        // like slate's push, but rounds left/top to screen border/center
        $.log('snap', dir);
        var s = this.screen();
        var x = this.x;
        var y = this.y;
        // corners
        var match = dir.match(/^([^-]+)-([^-]+)$/);
        if (match) {
            this.snap(match[1]);
            this.snap(match[2]);
            return;
        }
        // cardinal directions
        var mid;
        if (dir == 'left') {
            x = s.left();
        } else if (dir == 'top') {
            y = s.top();
        } else if (dir == 'right') {
            x = s.right() - this.width;
            mid = Math.abs(x - s.midX());
            if (this.width / mid < 0.05) {
                x = s.midX();
            }
        } else if (dir == 'bottom') {
            y = s.bottom() - this.height;
            mid = Math.abs(y - s.midY());
            if (this.height / mid < 0.05) {
                x = s.midY();
            }
        }
        this.move({x: x, y: y});
    },
    'throw': function() {
        return this.toss.apply(this, arguments);
    },
    toss: function(num, resize) {
        var screen = slate.screenForRef(num.toString());
        var s = $.screen(screen);
        if (resize)
            this.resize(s.rect());
        this.move(s.rect());
        if (resize)
            this.resize(s.rect());
    }
});
