import React, { useState } from 'react';
import type { ImageState, ClothingCategory } from '../types';
import ImageUploader from '../components/ImageUploader';
import { useCloset } from '../hooks/useCloset';
import ClosetItem from '../components/ClosetItem';
import { analyzeAndProcessClothingItem } from '../services/geminiService';
import Spinner from '../components/Spinner';
import { compressImage } from '../utils/imageUtils';
import SkeletonCard from '../components/SkeletonCard';

interface ClosetViewProps {
    closet: ReturnType<typeof useCloset>;
}

const AddIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

interface AnalyzedData {
    image: Omit<ImageState, 'id' | 'category' | 'name' | 'tags'>;
    name: string;
    tags: string[];
    category: ClothingCategory;
}

const ClosetView: React.FC<ClosetViewProps> = ({ closet }) => {
    const [newImage, setNewImage] = useState<Omit<ImageState, 'id'| 'category'> | null>(null);
    const [category, setCategory] = useState<ClothingCategory>('Tops');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [analyzedData, setAnalyzedData] = useState<AnalyzedData | null>(null);
    
    const categories: ClothingCategory[] = ['Tops', 'Bottoms', 'Shoes', 'Accessories'];

    const handleAnalyzeItem = async () => {
        if (!newImage) return;

        setIsProcessing(true);
        setError(null);
        setAnalyzedData(null);
        try {
            const { processedImage, name, tags } = await analyzeAndProcessClothingItem(newImage, category);
            if (!processedImage.dataUrl) {
                throw new Error("AI analysis failed to return an image.");
            }
            const compressedDataUrl = await compressImage(processedImage.dataUrl, 256);
            
            setAnalyzedData({
                image: {
                    dataUrl: compressedDataUrl,
                    mimeType: processedImage.mimeType,
                    base64: processedImage.base64,
                    file: null,
                },
                name,
                tags,
                category: category, // Lock in the category at the time of analysis
            });
            setNewImage(null);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred during analysis.");
            }
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleSaveItem = () => {
        if (!analyzedData || !analyzedData.image.dataUrl || !analyzedData.image.mimeType) return;
        
        const newItemToSave: Omit<ImageState, 'id'> = {
            dataUrl: analyzedData.image.dataUrl,
            mimeType: analyzedData.image.mimeType,
            category: analyzedData.category, // Use the category from the analyzed data
            name: analyzedData.name,
            tags: analyzedData.tags,
        };
        
        closet.addItem(newItemToSave);
        setAnalyzedData(null);
    };

    const renderClosetContent = () => {
        if (!closet.isLoaded) {
            return (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            )
        }
        
        if (closet.closet.length === 0) {
             return (
                <div className="text-center py-10 px-6 bg-background rounded-lg">
                    <h3 className="text-lg font-medium text-primary">Your Closet is Empty</h3>
                    <p className="text-secondary mt-2">Start by adding clothes. The AI will automatically remove the background and tag them for you!</p>
                </div>
            )
        }

        return (
             <div className="space-y-8">
                {categories.map(cat => {
                    const items = closet.getItemsByCategory(cat);
                    if (items.length === 0) return null;

                    return (
                        <div key={cat}>
                            <h3 className="text-2xl font-bold text-primary mb-4 pb-2 border-b">{cat}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {items.map(item => (
                                    <ClosetItem key={item.id} item={item} onRemove={closet.removeItem} showRemoveButton={true} />
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="space-y-10">
            {!analyzedData ? (
                 <div className="p-6 border border-gray-200/80 rounded-lg bg-background">
                    <h2 className="text-xl font-bold text-primary mb-4">Add New Item: Step 1 of 2</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <ImageUploader id="new-closet-item" label="1. Upload Image" imageState={newImage} onImageChange={setNewImage} icon={<AddIcon />} />
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-primary mb-2">2. Select Category</label>
                            <select id="category" value={category} onChange={(e) => setCategory(e.target.value as ClothingCategory)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white text-primary border-gray-300 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md">
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <p className="text-xs text-secondary mt-1">The AI will crop the item based on this category.</p>
                        </div>
                        <button type="button" onClick={handleAnalyzeItem} disabled={!newImage || isProcessing} className={`w-full inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors duration-200 ${newImage && !isProcessing ? 'bg-accent hover:bg-accent-hover' : 'bg-gray-300 cursor-not-allowed'}`}>
                            {isProcessing && <Spinner className="text-white mr-2" />}
                            {isProcessing ? 'Analyzing...' : 'Analyze Item'}
                        </button>
                    </div>
                    {error && <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert"><p><span className="font-bold">Error:</span> {error}</p></div>}
                </div>
            ) : (
                <div className="p-6 border border-accent/50 rounded-lg bg-accent/5">
                    <h2 className="text-xl font-bold text-primary mb-4">Add New Item: Step 2 of 2</h2>
                     <p className="text-sm text-secondary mb-4">The AI has processed your item. Confirm the details below or make edits before saving.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                       <div className="flex flex-col items-center">
                           <label className="block text-sm font-medium text-primary mb-2">Processed Image</label>
                           <div className="w-full h-48 bg-white rounded-lg flex items-center justify-center p-2 shadow-sm border">
                                <img src={analyzedData.image.dataUrl!} alt="Processed item" className="max-h-full max-w-full object-contain" />
                           </div>
                       </div>
                       <div className="space-y-4">
                           <div>
                                <label htmlFor="itemName" className="block text-sm font-medium text-primary mb-1">Item Name</label>
                                <input type="text" id="itemName" value={analyzedData.name} onChange={(e) => setAnalyzedData(d => d ? {...d, name: e.target.value} : null)} className="w-full px-3 py-2 bg-white text-primary border border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent"/>
                           </div>
                            <div>
                               <label htmlFor="itemTags" className="block text-sm font-medium text-primary mb-1">Tags (comma-separated)</label>
                               <input type="text" id="itemTags" value={analyzedData.tags.join(', ')} onChange={(e) => setAnalyzedData(d => d ? {...d, tags: e.target.value.split(',').map(t=>t.trim())} : null)} className="w-full px-3 py-2 bg-white text-primary border border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent"/>
                           </div>
                       </div>
                        <div className="flex flex-col gap-2 self-end">
                            <button onClick={handleSaveItem} className="w-full inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700">Save to Closet</button>
                             <button onClick={() => setAnalyzedData(null)} className="w-full text-center px-6 py-2 text-sm text-secondary hover:text-primary">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            
            {renderClosetContent()}

        </div>
    );
};

export default ClosetView;