import React from 'react';
import type { View } from '../App';

interface HeaderProps {
    currentView: View;
    setCurrentView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setCurrentView }) => {
    const navItems: { id: View; label: string }[] = [
        { id: 'closet', label: 'My Closet' },
        { id: 'stylist', label: 'AI Stylist' },
        { id: 'try-on', label: 'Outfit Builder' },
    ];

    return (
        <nav className="bg-white/60 backdrop-blur-sm p-2 rounded-t-2xl border border-b-0 border-gray-200/80 flex justify-center items-center space-x-2 sm:space-x-4">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={`px-3 sm:px-5 py-2.5 text-sm sm:text-base font-medium rounded-lg transition-all duration-300 relative ${
                        currentView === item.id
                            ? 'text-accent'
                            : 'text-secondary hover:bg-gray-100 hover:text-primary'
                    }`}
                    aria-current={currentView === item.id ? 'page' : undefined}
                >
                    {item.label}
                    {currentView === item.id && (
                         <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-0.5 bg-accent rounded-full"></span>
                    )}
                </button>
            ))}
        </nav>
    );
};

export default Header;