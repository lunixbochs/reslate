Reslate
=======

*A solid backbone for your `.slate.js.`*

Getting Started
-------

1. Do you have Slate? [Get Slate.](https://github.com/jigish/slate)

2. Clone this repo to somewhere convenient.

2. `ln -s "$(pwd)"/reslate.js ~/.reslate.js` (Run this in Terminal / bash).

3. `S.src('.reslate.js');` from `.slate.js` to use.

    If you're new to slate, copy my `slate.example.js` to `~/.slate.js` instead.

4. Either way, look at [`slate.example.js`](/slate.example.js) for a full configuration.

5. Reslate has a high ratio of comments to code. Dive into [`reslate.js`](/reslate.js) and hack away.

Hyper Key
-------
You should probably set up a Hyper Key if you plan on using Slate and your computer at the same time.

[Using PCKeyboardHack and KeyRemap4Macbook to create a Hyper key.](http://www.leancrew.com/all-this/2012/11/shift-control-option-command-on-caps-lock/)

I recommend modifying your `private.xml` to only map Hyper to `ctrl+alt+cmd` (and not `shift`).

This allows you to bind both `hyper` and `hyper+shift` as modifiers.
