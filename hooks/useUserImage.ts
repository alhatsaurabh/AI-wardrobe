import { useCallback } from 'react';
import type { ImageState } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { compressImage } from '../utils/imageUtils';


const USER_IMAGE_STORAGE_KEY = 'virtual_closet_user_image';

export const useUserImage = () => {
    const [image, setImageState] = useLocalStorage<ImageState | null>(USER_IMAGE_STORAGE_KEY, null);

    const setImage = useCallback(async (newImage: Omit<ImageState, 'id' | 'category'>) => {
        if (!newImage.dataUrl) return;

        try {
            const compressedDataUrl = await compressImage(newImage.dataUrl, 512);
            const { file, base64, ...restOfNewImage } = newImage;
            const fullImageState: ImageState = {
                ...restOfNewImage,
                dataUrl: compressedDataUrl,
                id: `user-${Date.now()}`,
            };
            setImageState(fullImageState);
        } catch (error) {
            console.error("Failed to compress user image:", error);
            // Fallback to uncompressed if compression fails
            const { file, base64, ...restOfNewImage } = newImage;
            const fullImageState: ImageState = {
                ...restOfNewImage,
                id: `user-${Date.now()}`,
            };
            setImageState(fullImageState);
        }
    }, [setImageState]);


    return {
        image,
        setImage,
        isLoaded: image !== null,
    };
};
