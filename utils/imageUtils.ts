export const compressImage = (dataUrl: string, maxWidth: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            let { width, height } = img;

            if (width <= maxWidth) {
                resolve(dataUrl);
                return;
            }
            
            height = (height * maxWidth) / width;
            width = maxWidth;
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            
            const mimeType = dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
            
            // Provide a quality setting for JPEGs for better compression
            if (mimeType === 'image/jpeg') {
                resolve(canvas.toDataURL(mimeType, 0.9)); // 90% quality
            } else {
                 resolve(canvas.toDataURL(mimeType));
            }
        };
        img.onerror = (error) => reject(new Error(`Image loading failed: ${String(error)}`));
    });
};
