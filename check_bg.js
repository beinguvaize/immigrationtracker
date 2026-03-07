const { Jimp, intToRGBA } = require("jimp");
const path = require("path");

async function manualCrop() {
    const logoPath = path.join("C:\\Users\\uvaiz\\.gemini\\antigravity\\brain\\6be7b919-cf33-47aa-8f44-b1fd0f15ff3b\\logo_no_tagline_clean_1772836666592.png");
    try {
        const image = await Jimp.read(logoPath);
        const w = image.bitmap.width;
        const h = image.bitmap.height;

        let minX = w, minY = h, maxX = 0, maxY = 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const hex = image.getPixelColor(x, y);
                const rgba = intToRGBA(hex);
                // Exclude white OR transparent
                const isWhite = rgba.r > 240 && rgba.g > 240 && rgba.b > 240;
                const isTransparent = rgba.a < 20;
                if (!isWhite && !isTransparent) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        console.log(`Bounds: x=${minX}, y=${minY}, w=${maxX - minX + 1}, h=${maxY - minY + 1}`);
    } catch (e) {
        console.error(e);
    }
}

manualCrop();
