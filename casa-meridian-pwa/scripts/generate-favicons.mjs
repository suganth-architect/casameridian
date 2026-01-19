
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE_IMAGE = 'C:/Users/lucky/.gemini/antigravity/brain/b233e422-4e9c-4a63-b916-5b0bdfc9d02a/uploaded_image_1768837605604.jpg';
const OUTPUT_DIR = './public/favicon';

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generate() {
    try {
        console.log('Generating favicons...');

        // 16x16
        await sharp(SOURCE_IMAGE).resize(16, 16).toFile(path.join(OUTPUT_DIR, 'favicon-16x16.png'));

        // 32x32
        await sharp(SOURCE_IMAGE).resize(32, 32).toFile(path.join(OUTPUT_DIR, 'favicon-32x32.png'));

        // Apple Touch Icon (180x180)
        await sharp(SOURCE_IMAGE).resize(180, 180).toFile(path.join(OUTPUT_DIR, 'apple-touch-icon.png'));

        // Android 192
        await sharp(SOURCE_IMAGE).resize(192, 192).toFile(path.join(OUTPUT_DIR, 'android-chrome-192x192.png'));

        // Android 512
        await sharp(SOURCE_IMAGE).resize(512, 512).toFile(path.join(OUTPUT_DIR, 'android-chrome-512x512.png'));

        // Favicon.ico (Use 32x32 png, rename to ico. Modern browsers handle this)
        await sharp(SOURCE_IMAGE).resize(32, 32).toFile(path.join(OUTPUT_DIR, 'favicon.ico'));

        console.log('Favicons generated successfully.');

        // Webmanifest
        const manifest = {
            name: "Casa Meridian",
            short_name: "Casa Meridian",
            icons: [
                { src: "/favicon/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
                { src: "/favicon/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
            ],
            theme_color: "#ffffff",
            background_color: "#ffffff",
            display: "standalone"
        };

        fs.writeFileSync(path.join(OUTPUT_DIR, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
        console.log('Manifest created.');

    } catch (err) {
        console.error('Error generating favicons:', err);
        process.exit(1);
    }
}

generate();
