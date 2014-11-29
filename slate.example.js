/* File: slate.example.js
 * Author: lunixbochs (Ryan Hileman) and ProLoser (Dean Sofer)
 * Project: http://github.com/lunixbochs/reslate https://github.com/ProLoser/reslate
 */

S.src('.reslate/reslate.js');
// enable to see debug messages in Console.app
// $.debug = true;
 
slate.alias('hyper', 'ctrl;alt;cmd');
 
// begin config
slate.configAll({
    defaultToCurrentScreen: true,
    nudgePercentOf: 'screenSize',
    resizePercentOf: 'screenSize',
    undoOps: [
        'active-snapshot',
        'chain',
        'grid',
        'layout',
        'move',
        'resize',
        'sequence',
        'shell',
        'push'
    ]
});

function position(win) {
    $.log('position', 'cols:', win.splitx, 'rows:', win.splity, 'x:', win.offx, 'y:', win.offy);
    var snapRight = (win.offx > 1 && win.offx < 2) && win.offx > 0,
        snapBottom = (win.offy > 1 && win.offy < 2) && win.offy > 0;
    win.divResize(win.splitx, win.splity, win.offx, win.offy, snapRight, snapBottom);
}
function reset(win, hard) {
    if (!win.splitx || hard) {
        win.splitx = 1;
        win.splity = 1;
        win.offx = 0;
        win.offy = 0;
    }
}


var screenCount = slate.screenCount();
steps = [1.5, 2, 3];
var lastStep = steps[steps.length-1];
function nextStep(step) {
    var index = steps.indexOf(step);
    return (index >= steps.length-1) ? steps[0] : steps[++index];
}

// bindings
slate.bindAll({
    hyper: {
        shift: {
            left: function(win) {
                reset(win);
                if (win.offx === 0) {
                    if (screenCount > 1)
                        win.toss('-');
                    win.offx = Math.ceil(win.splitx) - 1;
                } else {
                    win.offx--;
                }
                position(win);
            },
            right: function(win) {
                reset(win);
                win.offx++;
                if (win.offx >= Math.ceil(win.splitx)) {
                    if (screenCount > 1)
                        win.toss('+');
                    win.offx = 0;
                }
                position(win);
            },
            up: function(win) {
                reset(win);
                if (win.offy === 0) {
                    win.offy = Math.ceil(win.splity) - 1;
                } else {
                    win.offy--;
                }
                position(win);
            },
            down: function(win) {
                reset(win);
                win.offy++;
                if (win.offy >= Math.ceil(win.splity))
                    win.offy = 0;
                position(win);
            }
        },
        left: function(win) {
            reset(win);
            if (win.offx === 0) {
                if (screenCount > 1 && win.splitx === lastStep) {
                    reset(win, true);
                    win.toss('-', 'resize');
                } else {
                    win.splitx = nextStep(win.splitx);
                    position(win);
                }
            } else {
                win.offx--;
                position(win);
            }
        },
        j: function(win){this.left(win);},
        right: function(win) {
            reset(win);
            if (win.offx === win.splitx - 1 || win.offx && win.splitx > 1 && win.splitx < 2) {
                if (screenCount > 1 && win.splitx === lastStep) {
                    reset(win, true);
                    win.toss('+', 'resize');
                } else {
                    var nextSplit = nextStep(win.splitx);
                    if (nextSplit > 2 || !win.offx)
                        win.offx++;
                    if (nextSplit < win.splitx)
                        win.offx = Math.ceil(nextSplit) - 1;
                    win.splitx = nextSplit;
                    position(win);
                }
            } else {
                win.offx++;
                position(win);
            }
        },
        l: function(win){this.right(win);},
        up: function(win) {
            reset(win);
            if (win.offy === 0) {
                win.splity = nextStep(win.splity);
            } else {
                win.offy--;
            }
            position(win);
        },
        i: function(win){this.up(win);},
        down: function(win) {
            reset(win);
            if (win.offy === win.splity - 1 || win.offy && win.splity > 1 && win.splity < 2) {
                var nextSplit = nextStep(win.splity);
                if (nextSplit > 2 || !win.offy)
                    win.offy++;
                if (nextSplit < win.splity) 
                    win.offy = Math.ceil(nextSplit) - 1;
                win.splity = nextSplit;
            } else {
                win.offy++;
            }
            position(win);
        },
        k: function(win){this.down(win);},
        space: function(win) {
            reset(win, true);
            position(win);
        },
        'return': [
            $('barResize', 'left', 1),
            $('center', 'center', 1.5, 1.25)
        ],
        // throw to monitor
        '`': ['throw 0 resize',
              'throw 1 resize'],
        // direct focus 
        // utility functions
        f1: 'relaunch',
        z: 'undo'
    }
});
 
// Auto Snapshotting
 
// Returns name generated from screen resolutions
function getName() {
  var name = [];
  slate.eachScreen(function(screen){
    var rect = screen.rect();
    name.push(rect.width+'x'+rect.height);
  });
  return name;
}
 

// Save snapshot
function save(event, win){
  $.log('saved', getName());
  slate.operation("snapshot", {
    name: getName().join('y'),
    save: true
  }).run();
  // slate.default(getName(), getName().join('y'));
}
 
// Load snapshot
function load(event, win){
  $.log('loaded', getName());
  slate.operation("activate-snapshot", {
    name: getName().join('y')
  }).run();
}

// slate.on('windowMoved', save);
// slate.on('windowResized', save);
// slate.on('appOpened', load);
// TODO: Requires 'screenConfigurationChanged' for some reason
slate.on('screenConfigurationChanged', function(){
    screenCount = slate.screenCount();
});