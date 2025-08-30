import React, { useState } from 'react';
import ImageUploader from '../components/ImageUploader';
import type { ImageState } from '../types';

interface OnboardingViewProps {
    onImageUploaded: (image: Omit<ImageState, 'id' | 'category'>) => Promise<void>;
}

const BodyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const OnboardingView: React.FC<OnboardingViewProps> = ({ onImageUploaded }) => {
    const [userImage, setUserImage] = useState<Omit<ImageState, 'id' | 'category'> | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleConfirm = async () => {
        if (userImage) {
            setIsSaving(true);
            await onImageUploaded(userImage);
            // No need to set isSaving to false, as the component will unmount
        }
    };

    return (
        <div className="min-h-screen bg-background text-primary flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-200/80">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold tracking-tight">
                        Welcome to Your <span className="text-accent">Virtual Wardrobe</span>
                    </h1>
                    <p className="mt-4 text-lg text-secondary">
                        To get started, please upload a full-body photo of yourself. This will be your model for the virtual try-on experience.
                    </p>
                </header>
                <main className="flex flex-col items-center gap-6">
                    <div className="w-full max-w-md">
                        <ImageUploader
                            id="onboarding-user-image"
                            label="Upload Your Photo"
                            imageState={userImage}
                            onImageChange={setUserImage}
                            icon={<BodyIcon />}
                        />
                    </div>
                    <button
                        onClick={handleConfirm}
                        disabled={!userImage || isSaving}
                        className={`w-full max-w-md inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors duration-300 ${
                            userImage && !isSaving
                                ? 'bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent'
                                : 'bg-gray-300 cursor-not-allowed'
                        }`}
                    >
                        {isSaving ? 'Saving...' : 'Save Photo & Start'}
                    </button>
                </main>
                 <footer className="text-center mt-8 text-sm text-secondary/80">
                    <p>Your photo is stored locally in your browser and is never uploaded to a server.</p>
                </footer>
            </div>
        </div>
    );
};

export default OnboardingView;