'use strict';

// Native
const EventEmitter = require('events')

// Packages
const HID = require('node-hid')

const NUM_KEYS = 12
const NUM_KEYS_PER_ROW = 6
const PACKET_SIZE = 31438
const HEADER_SIZE = 306 
const ICON_SIZE = 102
const NUM_TOTAL_PIXELS = 102 * 102

const VENDOR_ID = 0x3282
const PRODUCT_IDS = [0x0009]

const INIT_MSG = '0011800000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
const IMG_MSG  = '0021000000FF3d00006565000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

const NULLBYTE = Buffer.from([0x00])

function findDevicePaths(devices) {
	const connectedDisplaypads = devices.filter(device => {
		return device.vendorId === VENDOR_ID && PRODUCT_IDS.indexOf(device.productId) !== -1;
	});
	if (!connectedDisplaypads.length) {
		throw new Error('No Displaypads are connected.');
	}

	let displayPath = connectedDisplaypads.filter((device) => {
		return device.interface==1
	})[0].path

	let devicePath = connectedDisplaypads.filter((device) => {
		return device.interface==3
	})[0].path
	return {display: displayPath, device: devicePath}
}

class Displaypad extends EventEmitter {
	/**
	 * The pixel size of an icon written to the Displaypad key.
	 *
	 * @readonly
	 */
	static get ICON_SIZE() {
		return ICON_SIZE;
	}

	/**
	 * The number of keys on the panel.
	 *
	 * @readonly
	 */
	static get NUM_KEYS() {
		return NUM_KEYS;
	}

	/**
	 * The number of keys per row on the panel.
	 *
	 * @readonly
	 */
	static get NUM_KEYS_PER_ROW() {
		return NUM_KEYS_PER_ROW;
	}

	static get VENDOR_ID() {
		return VENDOR_ID;
	}

	static get PRODUCT_IDS() {
		return PRODUCT_IDS;
	}


	/**
	 * Checks a value is a valid RGB value. A number between 0 and 255.
	 *
	 * @static
	 * @param {number} value The number to check
	 */
	static checkRGBValue(value) {
		if (value < 0 || value > 255) {
			throw new TypeError('Expected a valid color RGB value 0 - 255');
		}
	}

	/**
	 * Checks a keyIndex is a valid key for a device. A number between 0 and 11.
	 *
	 * @static
	 * @param {number} keyIndex The keyIndex to check
	 */
	static checkValidKeyIndex(keyIndex) {
		if (keyIndex < 0 || keyIndex >= NUM_KEYS ) {
			throw new TypeError(`Expected a valid keyIndex 0 - ${NUM_KEYS-1}`);
		}
	}

	static async openAsync() {
		// Device path not provided, will then select any connected device.
		const devices = await HID.devicesAsync();

		const paths = findDevicePaths(devices)

		var display = await HID.HIDAsync.open(paths.display)
		var device  = await HID.HIDAsync.open(paths.device)

		return new Displaypad(display, device)
	}
		
	constructor(...args) {
		super();
		if (args.length == 0) {
			// Device path not provided, will then select any connected device.
			const devices = HID.devices();

			const paths = findDevicePaths(devices)

			this.display = new HID.HID(paths.display)
			this.device  = new HID.HID(paths.device)
		} else if (args.length == 2 && typeof args[1] === HID.HIDAsync && typeof args[2] === HID.HIDAsync) {
			this.display = args[1]
			this.device = args[2]
		} else {
			throw new Error('Not yet implemented')
		}

		this.imageHeader = Buffer.alloc(HEADER_SIZE)
		this.queue = []
		this.keyState = new Array(NUM_KEYS+1).fill(0);

		this.device.on('data', data => {
			this._processDataEvent(data)
		});

		this.device.on('error', err => {
			this.emit('error', err);
		});

		this.device.write(Buffer.from(INIT_MSG, 'hex'))
	}

	/**
	 * Fills the given key with a solid color.
	 *
	 * @param {number} keyIndex The key to fill 0 - 11
	 * @param {number} r The color's red value. 0 - 255
	 * @param {number} g The color's green value. 0 - 255
	 * @param {number} b The color's blue value. 0 -255
	 */
	fillColor(keyIndex, r, g, b) {
		Displaypad.checkValidKeyIndex(keyIndex);

		Displaypad.checkRGBValue(r);
		Displaypad.checkRGBValue(g);
		Displaypad.checkRGBValue(b);

		const pixel = Buffer.from([b, g, r]);
		this._writePixelData(keyIndex, Buffer.alloc(PACKET_SIZE, pixel))
	}

	/**
	 * Fills the given key with an image in a Buffer.
	 *
	 * @param {number} keyIndex The key to fill 0 - 11
	 * @param {Buffer} imageBuffer
	 */
	fillImage(keyIndex, imageBuffer) {
		Displaypad.checkValidKeyIndex(keyIndex);

		if (imageBuffer.length !== NUM_TOTAL_PIXELS*3) {
			throw new RangeError(`Expected image buffer of length ${NUM_TOTAL_PIXELS*3}, got length ${imageBuffer.length}`);
		}
		const byteBuffer = Buffer.alloc(PACKET_SIZE)
		for (let y = 0; y < ICON_SIZE; y++) {
			const rowOffset = ICON_SIZE * 3 * y
			for (let x = 0; x < ICON_SIZE; x++) {
				const offset = rowOffset + 3*x

				const red   = imageBuffer.readUInt8(offset)
				const green = imageBuffer.readUInt8(offset+1)
				const blue  = imageBuffer.readUInt8(offset+2)

				byteBuffer.writeUInt8(blue,offset)
				byteBuffer.writeUInt8(green,offset+1)
				byteBuffer.writeUInt8(red,offset+2)
			}
		}
		this._writePixelData(keyIndex, byteBuffer)

	}

	/**
	 * Clears the given key.
	 *
	 * @param {number} keyIndex The key to clear 0 - 11
	 * @returns {undefined}
	 */
	clearKey(keyIndex) {
		Displaypad.checkValidKeyIndex(keyIndex);

		this._writePixelData(keyIndex, Buffer.alloc(PACKET_SIZE))
	}

	/**
	 * Clears all keys.
	 *
	 * returns {undefined}
	 */
	clearAllKeys() {
		const buffer = Buffer.alloc(PACKET_SIZE)
		for (let keyIndex = 0; keyIndex < NUM_KEYS; keyIndex++) {
			this._writePixelData(keyIndex, buffer)
		}
	}

	close() {
		this.device.close()
		this.display.close()
	}

	/**
	 * Checks whether the state (pressed/released) of a button has changed
	 * If a change is detected, an event gets emited
	 *
	 * @private
	 * @param {number} keyIndex The key to check, 1 - 12
	 * @param {number} keyPressed The state of the key, 0 = released
	 */
	_keyIsPressed(keyIndex, keyPressed) {
		const stateChanged = keyPressed !== this.keyState[keyIndex];
		if (stateChanged) {
			this.keyState[keyIndex] = keyPressed;
			if (keyPressed) {
				this.emit('down', keyIndex);
			} else {
				this.emit('up', keyIndex);
			}
		}
	}

	/**
	 * USB data event handler
	 *
	 * @private
	 * @param {Buffer} data The payload received via USB
	 */
	_processDataEvent(data) {
		if (data[0] == 0x01) { // Key press/release event
			// Row 1
			this._keyIsPressed(1, data[42] & 0x02);
			this._keyIsPressed(2, data[42] & 0x04);
			this._keyIsPressed(3, data[42] & 0x08);
			this._keyIsPressed(4, data[42] & 0x10);
			this._keyIsPressed(5, data[42] & 0x20);
			this._keyIsPressed(6, data[42] & 0x40);

			// Row 2
			this._keyIsPressed(7, data[42] & 0x80);
			this._keyIsPressed(8, data[47] & 0x01);
			this._keyIsPressed(9, data[47] & 0x02);
			this._keyIsPressed(10, data[47] & 0x04);
			this._keyIsPressed(11, data[47] & 0x08);
			this._keyIsPressed(12, data[47] & 0x10);
		} else if (data[0] == 0x21) {
			if (data[1] == 0x00 && data[2] == 0x00) {
				// The displaypad echoes the IMG_MSG. After receiving the echo,
				// the image can be transfered.
				var request = this.queue.shift()
				var data = Buffer.concat([this.imageHeader, request.pixels])

				for (let i=0; i < data.length; i+=1024) {
				        const chunk = data.slice(i, i+1024)
				        this.display.write(Buffer.concat([ NULLBYTE, chunk ]))
				}

				this.display.write(Buffer.concat([this.imageHeader, request.pixels]))
			}
			if (data[1] == 0x00 && data[2] == 0xff) {
				if (this.queue.length != 0) {
					this._startPixelTransfer(this.queue[0].keyIndex)
				}
			}
		}
	}

	/**
	 * Writes Displaypad's pixel data to the Displaypad.
	 *
	 * @private
	 * @param {number} keyIndex The key to write to 0 - 11
	 * @param {Buffer} buffer Image data for the button
	 * @returns {undefined}
	 */
	_writePixelData(keyIndex, pixels) {
		this.queue.push({keyIndex:keyIndex, pixels:pixels})
		if (this.queue.length == 1) {
			this._startPixelTransfer(keyIndex)
		}
	}

	_startPixelTransfer(keyIndex) {
		var data = Buffer.from(IMG_MSG, 'hex')
		data[5] = keyIndex
		this.device.write(data)
	}
}

module.exports = Displaypad;
