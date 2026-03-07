const { Jimp, intToRGBA } = require("jimp");
const path = require("path");

async function perfectCrop() {
    const sourcePath = path.join("C:\\Users\\uvaiz\\.gemini\\antigravity\\brain\\6be7b919-cf33-47aa-8f44-b1fd0f15ff3b\\logo_no_tagline_clean_1772836666592.png");
    const destPath = path.join(__dirname, "public", "assets", "logo.png");

    try {
        const image = await Jimp.read(sourcePath);
        const w = image.bitmap.width;
        const h = image.bitmap.height;

        let minX = w, minY = h, maxX = 0, maxY = 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const hex = image.getPixelColor(x, y);
                const rgba = intToRGBA(hex);
                // Exclude white OR transparent background pixels
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

        // Tightly crop using the exact bounds found
        const cropX = minX;
        const cropY = minY;
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;

        console.log(`Cropping to exact boundaries: x=${cropX}, y=${cropY}, w=${cropW}, h=${cropH}`);

        image.crop({ x: cropX, y: cropY, w: cropW, h: cropH });
        await image.write(destPath); // Overwrite the actual app asset
        console.log("Crop and save successful!");
    } catch (e) {
        console.error(e);
    }
}

perfectCrop();
