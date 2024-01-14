# mountain-displaypad

[`mountain-displaypad`](https://github.com/JeLuF/mountain-displaypad) is a Node.js library for interfacing
with Mountain's [Displaypad](https://mountain.gg/keypads/displaypad/).

> ❗ Please note that `imountain-displaypad` is NOT a standalone application. Instead, `mountain-displaypad` is a code library, which developers can use to make their own applications which interface with the Displaypad.

## References

This library is based on [`infinitton-idisplay`](https://github.com/bitfocus/node-infinitton-idisplay/), which is a modified version of [`elgato-stream-deck`](https://github.com/lange/node-elgato-stream-deck) that does not have dependencies to image libraries, and that talks to the Infinitton device instead of the Elgato Stream Deck.

## Install

`$ npm install --save mountain-displaypad`

### Example

```javascript
const Displaypad = require('./mountain-displaypad')

pad = new Displaypad()

pad.on('up', (key) => {console.log('Button up:', key)})
pad.on('down', (key) => {console.log('Button down:', key)})

pad.clearAllKeys()

pad.fillColor(0, 255,   0,   0)
pad.fillColor(1, 0,   255,   0)
pad.fillColor(2, 0,     0, 255)

// Create a new image with a light red line from the top left to the bottom right corner
image = Buffer.alloc(Displaypad.ICON_SIZE * Displaypad.ICON_SIZE * 3)

for (let i = 0; i < Displaypad.ICON_SIZE; i++) {
    offset = i * Displaypad.ICON_SIZE * 3 + i * 3
    image[offset]   = 0xff
    image[offset+1] = 0x7f
    image[offset+2] = 0x7f
}

pad.fillImage(9, image)
```
