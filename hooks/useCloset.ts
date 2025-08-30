import { useCallback } from 'react';
import type { ImageState, ClothingCategory } from '../types';
import { useLocalStorage } from './useLocalStorage';

const CLOSET_STORAGE_KEY = 'virtual_closet';

export const useCloset = () => {
    const [closet, setCloset] = useLocalStorage<ImageState[]>(CLOSET_STORAGE_KEY, []);

    const addItem = useCallback((item: Omit<ImageState, 'id'>) => {
        // Explicitly create the object to save, picking only the properties we need.
        // This is a defensive fix to prevent any unwanted properties from the original
        // upload from ever making it into the stored closet item.
        const itemToSave = {
            dataUrl: item.dataUrl,
            mimeType: item.mimeType,
            category: item.category,
            name: item.name,
            tags: item.tags,
        };

        const newItem: ImageState = {
            ...itemToSave,
            id: `item-${Date.now()}-${Math.random()}`,
        };

        setCloset(prevCloset => [...(prevCloset || []), newItem]);
    }, [setCloset]);

    const removeItem = useCallback((itemId: string) => {
        setCloset(prevCloset => (prevCloset || []).filter(item => item.id !== itemId));
    }, [setCloset]);

    const getItemsByCategory = useCallback((category: ClothingCategory) => {
        return (closet || []).filter(item => item.category === category);
    }, [closet]);
    
    const getAvailableCategories = useCallback((): ClothingCategory[] => {
        const categories = new Set((closet || []).map(item => item.category));
        return Array.from(categories).filter(c => c !== undefined) as ClothingCategory[];
    }, [closet]);

    return {
        closet: closet || [],
        addItem,
        removeItem,
        getItemsByCategory,
        getAvailableCategories,
        isLoaded: closet !== null,
    };
};
