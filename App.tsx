import React, { useState } from 'react';
import Header from './components/Header';
import TryOnView from './views/TryOnView';
import ClosetView from './views/ClosetView';
import StyleAdvisorView from './views/StyleAdvisorView';
import OnboardingView from './views/OnboardingView';
import { useCloset } from './hooks/useCloset';
import { useUserImage } from './hooks/useUserImage';

export type View = 'try-on' | 'closet' | 'stylist';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('closet');
    const closet = useCloset();
    const userImage = useUserImage();
    
    if (!userImage.image) {
        return <OnboardingView onImageUploaded={userImage.setImage} />;
    }

    const renderView = () => {
        switch (currentView) {
            case 'try-on':
                return <TryOnView userImage={userImage.image!} closet={closet.closet} />;
            case 'closet':
                return <ClosetView closet={closet} />;
            case 'stylist':
                return <StyleAdvisorView closet={closet.closet} userImage={userImage.image!} />;
            default:
                return <ClosetView closet={closet} />;
        }
    };

    return (
        <div className="min-h-screen bg-background text-primary flex flex-col items-center p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-7xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                        Virtual <span className="text-accent">Wardrobe</span>
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-secondary">
                        Your personal AI-powered fashion assistant.
                    </p>
                </header>
                
                <Header currentView={currentView} setCurrentView={setCurrentView} />

                <main className="bg-white p-6 sm:p-8 rounded-b-2xl shadow-xl border border-t-0 border-gray-200/80">
                    {renderView()}
                </main>
                
                <footer className="text-center mt-10 text-sm text-secondary/80">
                    <p>Powered by Google Gemini API. Your wardrobe is stored locally in your browser and is never uploaded.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;