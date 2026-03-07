const { Jimp, intToRGBA } = require("jimp");
const path = require("path");

async function manualCrop() {
    const logoPath = path.join(__dirname, "public", "assets", "logo.png");
    try {
        const image = await Jimp.read(logoPath);
        const w = image.bitmap.width;
        const h = image.bitmap.height;

        let minX = w, minY = h, maxX = 0, maxY = 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const hex = image.getPixelColor(x, y);
                const rgba = intToRGBA(hex);
                // If not pure white or transparent
                if ((rgba.r < 250 || rgba.g < 250 || rgba.b < 250) && rgba.a > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        console.log(`Bounds: x=${minX}, y=${minY}, w=${maxX - minX}, h=${maxY - minY}`);

        if (minX <= maxX && minY <= maxY) {
            image.crop({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
            await image.write(logoPath);
            console.log("Crop successful!");
        } else {
            console.log("No non-white pixels found?");
        }

    } catch (e) {
        console.error(e);
    }
}

manualCrop();
