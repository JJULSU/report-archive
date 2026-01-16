export interface Highlight {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Composites highlights onto an image and returns the result as a Data URL.
 * Used for "burning in" highlights before export or save.
 */
export const flattenImage = (base64Image: string, highlights: Highlight[]): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error("Failed to get canvas context"));
                return;
            }

            // Draw Base Image
            ctx.drawImage(img, 0, 0);

            // Draw Highlights
            ctx.fillStyle = 'rgba(255, 255, 0, 0.4)'; // Yellow transparent
            // ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)'; // Optional border

            highlights.forEach(h => {
                const x = h.x * img.width;
                const y = h.y * img.height;
                const w = h.width * img.width;
                const height = h.height * img.height;

                ctx.fillRect(x, y, w, height);
                // ctx.strokeRect(x, y, w, height); 
            });

            // Return as Data URL
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (e) => reject(e);
        img.src = base64Image;
    });
};

/**
 * Converts a Base64/DataURL to a Blob
 */
export const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return await res.blob();
};
