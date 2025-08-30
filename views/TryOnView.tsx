import React, { useState, useCallback, useMemo } from 'react';
import type { ImageState } from '../types';
import Spinner from '../components/Spinner';
import ClosetItem from '../components/ClosetItem';
import { generateOutfitTryOn, editGeneratedImage } from '../services/geminiService';
import ImageModal from '../components/ImageModal';

interface TryOnViewProps {
    userImage: ImageState;
    closet: ImageState[];
}

const TryOnView: React.FC<TryOnViewProps> = ({ userImage, closet }) => {
    const [outfitItems, setOutfitItems] = useState<ImageState[]>([]);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDragOver, setIsDragOver] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // State for Magic Edit
    const [editPrompt, setEditPrompt] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editError, setEditError] = useState<string | null>(null);

    const canGenerate = outfitItems.length > 0 && !isLoading;

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const itemId = event.dataTransfer.getData("text/plain");
        const itemToAdd = closet.find(item => item.id === itemId);
        
        if (itemToAdd && !outfitItems.find(item => item.id === itemId)) {
            setOutfitItems(prevItems => [...prevItems, itemToAdd]);
            setGeneratedImage(null);
            setError(null);
        }
        setIsDragOver(false);
    };

    const handleGenerate = useCallback(async () => {
        if (!canGenerate) return;

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        setEditError(null);
        setEditPrompt('');

        try {
            const result = await generateOutfitTryOn(userImage, outfitItems);
            setGeneratedImage(result);
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [userImage, outfitItems, canGenerate]);

    const handleEditImage = useCallback(async () => {
        if (!editPrompt || !generatedImage || isEditing) return;

        setIsEditing(true);
        setEditError(null);

        try {
            const [header, base64] = generatedImage.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
            const imageForEditing: Omit<ImageState, 'id'> = { dataUrl: generatedImage, base64, mimeType };

            const result = await editGeneratedImage(imageForEditing, editPrompt);
            setGeneratedImage(result); 
            setEditPrompt(''); 
        } catch (e) {
            if (e instanceof Error) {
                setEditError(e.message);
            } else {
                setEditError("An unexpected error occurred during editing.");
            }
        } finally {
            setIsEditing(false);
        }
    }, [generatedImage, editPrompt, isEditing]);

    const filteredCloset = useMemo(() => {
        if (!searchTerm) return closet;
        const lowercasedTerm = searchTerm.toLowerCase();
        return closet.filter(item => 
            item.name?.toLowerCase().includes(lowercasedTerm) || 
            item.tags?.some(tag => tag.toLowerCase().includes(lowercasedTerm))
        );
    }, [closet, searchTerm]);

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Canvas and Generation */}
                <div className="flex flex-col gap-6">
                    <div 
                        onDrop={handleDrop} 
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        className={`relative w-full aspect-[3/4] rounded-lg border-2 ${isDragOver ? 'border-accent' : 'border-gray-200'} border-dashed flex items-center justify-center p-2 transition-all duration-200 bg-background bg-contain bg-no-repeat bg-center`}
                        style={{ backgroundImage: `url(${userImage.dataUrl})` }}
                    >
                        <div className="absolute inset-0 grid grid-cols-4 gap-1 p-2 pointer-events-none">
                            {outfitItems.map(item => (
                                <div key={item.id} className="relative aspect-square">
                                    <img src={item.dataUrl!} title={item.name} alt={item.name} className="w-full h-full object-contain rounded-md bg-white/60 backdrop-blur-sm shadow" />
                                    <button 
                                        onClick={() => setOutfitItems(items => items.filter(i => i.id !== item.id))} 
                                        className="absolute -top-1.5 -right-1.5 h-6 w-6 bg-red-500 text-white text-sm rounded-full flex items-center justify-center shadow-lg pointer-events-auto hover:bg-red-600 transition-colors"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                        </div>
                        {!outfitItems.length && (
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-lg pointer-events-none">
                                <p className="text-white text-lg font-semibold text-center p-4 bg-primary/50 rounded-md backdrop-blur-sm">Drag items from your closet here</p>
                            </div>
                        )}
                    </div>
                    <div className="text-center">
                        <button
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            className={`w-full max-w-xs inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-all duration-300 ${
                                canGenerate 
                                    ? 'bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent' 
                                    : 'bg-gray-300 cursor-not-allowed'
                            }`}
                        >
                            {isLoading && <Spinner className="text-white mr-3"/>}
                            {isLoading ? 'Generating...' : 'Create My Look'}
                        </button>
                    </div>
                    {error && (
                        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-center" role="alert">
                            <p className="font-bold">Oops! Something went wrong.</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                    {generatedImage && !isLoading && (
                        <div className="border-t pt-6 animate-[fadeIn_0.5s_ease_in_out]">
                            <h3 className="text-xl font-bold text-center text-primary mb-4">Your Custom Look</h3>
                            <div className="bg-background p-2 rounded-lg shadow-md">
                                <img src={generatedImage} alt="Generated virtual try-on" className="max-w-full h-auto rounded-md object-contain" />
                            </div>

                            <div className="mt-4 flex justify-center gap-3">
                                <a 
                                  href={generatedImage} 
                                  download="virtual-outfit.png"
                                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-primary bg-white hover:bg-gray-50 transition-colors"
                                >
                                    Save Image
                                </a>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-primary bg-white hover:bg-gray-50 transition-colors"
                                >
                                    View Full Screen
                                </button>
                            </div>
                            
                            {/* MAGIC EDIT STUDIO */}
                            <div className="mt-6 border-t pt-6">
                                <h3 className="text-xl font-bold text-center text-primary mb-2">Magic Edit Studio</h3>
                                <p className="text-center text-secondary mb-4 text-sm">Refine your look with a simple command.</p>
                                <div className="flex items-start sm:items-center gap-2 flex-col sm:flex-row">
                                    <input 
                                        type="text" 
                                        value={editPrompt} 
                                        onChange={(e) => setEditPrompt(e.target.value)} 
                                        onKeyDown={(e) => e.key === 'Enter' && handleEditImage()}
                                        placeholder="e.g., 'make the background a sunny beach'" 
                                        className="flex-grow w-full px-4 py-2 bg-white text-primary border border-gray-300 rounded-md focus:ring-accent focus:border-accent"
                                    />
                                    <button
                                        onClick={handleEditImage}
                                        disabled={isEditing || !editPrompt}
                                        className={`w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors duration-200 ${
                                            !isEditing && editPrompt
                                                ? 'bg-primary hover:bg-gray-800'
                                                : 'bg-gray-300 cursor-not-allowed'
                                        }`}
                                    >
                                        {isEditing ? <Spinner className="text-white"/> : 'Refine'}
                                    </button>
                                </div>
                                {editError && <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert"><p><span className="font-bold">Edit Failed:</span> {editError}</p></div>}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Closet */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-2xl font-bold text-primary">My Closet</h2>
                    <input
                        type="text"
                        placeholder="Search by name or tag..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 bg-white text-primary border border-gray-300 rounded-md focus:ring-accent focus:border-accent"
                    />
                    <div className="h-[75vh] overflow-y-auto pr-2 -mr-2">
                        {filteredCloset.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {filteredCloset.map(item => (
                                    <ClosetItem key={item.id} item={item} onRemove={()=>{}} isDraggable={true} showRemoveButton={false} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-secondary text-center mt-8">No items found.</p>
                        )}
                    </div>
                </div>
            </div>
            {isModalOpen && generatedImage && (
                <ImageModal imageUrl={generatedImage} onClose={() => setIsModalOpen(false)} />
            )}
        </>
    );
};

export default TryOnView;