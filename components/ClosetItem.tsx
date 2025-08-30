import React from 'react';
import type { ImageState } from '../types';

interface ClosetItemProps {
    item: ImageState;
    onRemove: (id: string) => void;
    isDraggable?: boolean;
    showRemoveButton?: boolean;
}

const ClosetItem: React.FC<ClosetItemProps> = ({ item, onRemove, isDraggable = false, showRemoveButton = true }) => {
    
    const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
        event.dataTransfer.setData("text/plain", item.id);
    };

    return (
        <div 
            className="relative group aspect-square rounded-lg bg-background border border-gray-200/80 shadow-sm overflow-hidden transition-all duration-300"
            draggable={isDraggable}
            onDragStart={isDraggable ? handleDragStart : undefined}
        >
            <img 
                src={item.dataUrl ?? ''} 
                alt={item.name || "Closet item"} 
                title={item.name || "Closet item"}
                className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-primary bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center rounded-lg">
                {showRemoveButton && (
                    <button
                        onClick={() => onRemove(item.id)}
                        className="absolute top-1.5 right-1.5 h-7 w-7 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transform-gpu scale-75 group-hover:scale-100"
                        aria-label="Remove item"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
             <div className="absolute bottom-0 left-0 right-0 p-4 pt-10 bg-gradient-to-t from-black/70 to-transparent text-white text-xs rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <p className="font-semibold truncate">{item.name}</p>
            </div>
        </div>
    );
};

export default ClosetItem;