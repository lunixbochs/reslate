/* File: slate.example.js
 * Author: lunixbochs (Ryan Hileman)
 * Project: http://github.com/lunixbochs/reslate
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

// bindings
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
        'return': [
            $('barResize', 'left', 1),
            $('center', 'center', 1.5, 1.25)
        ],
        // throw to monitor
        '`': ['throw 0 resize',
              'throw 1 resize'],
        '1': $('toss', '0', 'resize'),
        '2': $('toss', '1', 'resize'),
        '3': $('toss', '2', 'resize'),
        // direct focus 
        a: $.focus('Adium'),
        c: $.focus('Google Chrome'),
        s: $.focus('Sublime Text'),
        t: $.focus('Terminal'),
        f: $.focus('Finder'),
        e: $.focus('Sparrow'),
        x: $.focus('X11'),
        p: $.focus('Spotify'),
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
    name: name().join(','),
    save: true
  }).run();
  slate.default(name(), name().join(','));
};
 
// Load snapshot
function load(event, win){
  $.log('loaded', name());
  slate.operation("activate-snapshot", {
    name: name().join(',')
  }).run();
};
 
slate.on('windowMoved', save);
slate.on('windowResized', save);
