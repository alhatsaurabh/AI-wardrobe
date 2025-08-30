import React from 'react';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div className="relative w-full h-full max-w-4xl max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
        <img src={imageUrl} alt="Full screen view of generated outfit" className="w-full h-full object-contain" />
      </div>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 h-10 w-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close full screen view"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default ImageModal;
