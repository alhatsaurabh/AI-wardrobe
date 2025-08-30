import React from 'react';
import type { ImageState } from '../types';

interface ImageUploaderProps {
  id: string;
  label: string;
  imageState: Omit<ImageState, 'id' | 'category'> | null;
  onImageChange: (imageState: Omit<ImageState, 'id' | 'category'>) => void;
  icon: JSX.Element;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, label, imageState, onImageChange, icon }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const [header, base64] = dataUrl.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || file.type;
        onImageChange({ file, dataUrl, base64, mimeType });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-primary mb-2">{label}</label>
      <div
        onClick={handleAreaClick}
        className="mt-1 flex justify-center items-center h-64 px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-accent transition-colors duration-200 bg-white"
      >
        {imageState?.dataUrl ? (
          <img src={imageState.dataUrl} alt="Preview" className="max-h-full rounded-lg object-contain" />
        ) : (
          <div className="space-y-1 text-center">
            {icon}
            <div className="flex text-sm text-secondary">
              <p className="pl-1">Click to upload an image</p>
            </div>
            <p className="text-xs text-secondary/80">PNG, JPG, up to 10MB</p>
          </div>
        )}
      </div>
      <input
        id={id}
        name={id}
        type="file"
        accept="image/*"
        className="sr-only"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUploader;