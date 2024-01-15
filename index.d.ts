import EventEmitter = require("events");

declare class Displaypad extends EventEmitter {
    /**
     * The pixel size of an icon written to the Infinitton key.
     */
    static get ICON_SIZE(): number;

    /**
     * The number of keys on the panel.
     */
    static get NUM_KEYS(): number;

    /**
     * The number of keys per row on the panel.
     */
    static get NUM_KEYS_PER_ROW(): number;
    
    static get VENDOR_ID(): number;
    static get PRODUCT_IDS(): number[];
    
    static async openAsync();
    constructor(devicePath: string);

    /**
     * Fills the given key with a solid color.
     *
     * @param {number} keyIndex The key to fill 0 - 14
     * @param {number} r The color's red value. 0 - 255
     * @param {number} g The color's green value. 0 - 255
     * @param {number} b The color's blue value. 0 -255
     */
    fillColor(keyIndex: number, r: number, g: number, b: number): void;

    /**
     * Fills the given key with an image in a Buffer.
     *
     * @param {number} keyIndex The key to fill 0 - 14
     * @param {Buffer} imageBuffer
     */
    fillImage(keyIndex: number, imageBuffer: Buffer): void;

    /**
     * Clears the given key.
     *
     * @param {number} keyIndex The key to clear 0 - 14
     */
    clearKey(keyIndex: number): void;

    /**
     * Clears all keys.
     */
    clearAllKeys(): void;

    close(): void
}

export = Displaypad;
