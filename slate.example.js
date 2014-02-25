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
 
var left = [
    $('barResize', 'left', 2),
    $('barResize', 'left', 1.5),
    $('toss', '-', 'resize')
];
var right = [
    $('barResize', 'right', 2),
    $('barResize', 'right', 3),
    $('toss', '+', 'resize')
];
var up = [
    $('barResize', 'top', 2),
    $('corner', 'top-left', 2, 2),
    $('corner', 'top-right', 2, 2),
    $('toss', '0', 'resize')
];
var down = [
    $('barResize', 'bottom', 2),
    $('corner', 'bottom-left', 2, 2),
    $('corner', 'bottom-right', 2, 2),
    $('toss', '0', 'resize')
];
function normalize(win) {
    $.log('move', win.splitx);
    if (!win.splitx) {
        reset(win);
    }
}
function position(win) {
    $.log('move', win.splitx, win.splity, win.offx, win.offy);
    win.divResize(win.splitx, win.splity, win.offx, win.offy);
}
left = function(win) {
    normalize(win);
    if (win.splitx === 3 && win.offx === 0) {
        reset(win);
        win.toss('-', 'resize');
    } else {
        if (win.splitx === 1 || (win.splitx === 2 && win.offx === 0)) win.splitx++;
        else if (win.offx > 0) win.offx--;
        position(win);
    }
};
right = function(win) {
    normalize(win);
    if (win.splitx === 3 && win.offx === 2) {
        reset(win);
        win.toss('+', 'resize');
    } else {
        if (win.splitx === 1 || (win.splitx === 2 && win.offx === 1)) win.splitx++;
        if (win.offx < 2) win.offx++;
        position(win);
    }
};
up = function(win) {
    normalize(win);
    if (win.splity === 1 || (win.splity === 2 && win.offy === 0)) win.splity++;
    else if (win.offy > 0) win.offy--;
    position(win);
};
down = function(win) {
    normalize(win);
    if (win.splity === 1 || (win.splity === 2 && win.offy === 1)) win.splity++;
    if (win.offy < 2) win.offy++;
    position(win);
};
var reset = function(win) {
    win.splitx = 1;
    win.splity = 1;
    win.offx = 0;
    win.offy = 0;
};

 
// bindings
slate.bindAll({
    hyper: {
        left: left,
        j: left,
        right: right,
        l: right,
        up: up,
        i: up,
        down: down,
        k: down,
        space: function(win) {
            reset(win);
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
        z: 'undo',
        tab: 'hint'
    }
});
 
// Auto Snapshotting
 
// Returns name generated from screen resolutions
function name() {
  var name = [];
  slate.eachScreen(function(screen){
    var rect = screen.rect()
    name.push(rect.width+'x'+rect.height);
  });
  return name;
}
 

// Save snapshot
function save(event, win){
  $.log('saved', name());
  slate.operation("snapshot", {
    name: name().join('y'),
    save: true
  }).run();
  // slate.default(name(), name().join('y'));
};
 
// Load snapshot
function load(event, win){
  $.log('loaded', name());
  slate.operation("activate-snapshot", {
    name: name().join('y')
  }).run();
};

slate.on('windowMoved', save);
slate.on('windowResized', save);
// slate.on('appOpened', load);
// slate.on('screenConfigurationChanged', load);