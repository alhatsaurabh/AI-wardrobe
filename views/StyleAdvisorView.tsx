import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { ImageState, ClothingCategory, OutfitRecommendation, WeatherInfo } from '../types';
import { getOutfitRecommendations, generateOutfitTryOn } from '../services/geminiService';
import Spinner from '../components/Spinner';
import ImageModal from '../components/ImageModal';

// This is a placeholder for a real weather API key.
// In a real application, this would be stored securely.
const WEATHER_API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY';

interface StyleAdvisorViewProps {
    closet: ImageState[];
    userImage: ImageState;
}

const StyleAdvisorView: React.FC<StyleAdvisorViewProps> = ({ closet, userImage }) => {
    const [recommendation, setRecommendation] = useState<OutfitRecommendation | null>(null);
    const [displayedItems, setDisplayedItems] = useState<Record<ClothingCategory, ImageState | null>>({ Tops: null, Bottoms: null, Shoes: null, Accessories: null });
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading on mount
    const [error, setError] = useState<string | null>(null);

    const [generatedOutfitImage, setGeneratedOutfitImage] = useState<string | null>(null);
    const [isGeneratingOutfit, setIsGeneratingOutfit] = useState<boolean>(false);
    const [outfitError, setOutfitError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [weather, setWeather] = useState<WeatherInfo | null>(null);
    const [weatherError, setWeatherError] = useState<string | null>(null);

    const closetByCategory = useMemo(() => {
        const result: Record<string, ImageState[]> = {};
        closet.forEach(item => {
            if (item.category) {
                if (!result[item.category]) {
                    result[item.category] = [];
                }
                result[item.category].push(item);
            }
        });
        return result;
    }, [closet]);

    const availableCategories = Object.keys(closetByCategory) as ClothingCategory[];

    const pickRandomItem = useCallback((category: ClothingCategory): ImageState | null => {
        const items = closetByCategory[category];
        if (!items || items.length === 0) return null;
        return items[Math.floor(Math.random() * items.length)];
    }, [closetByCategory]);

    const generateDisplayItems = useCallback((rec: OutfitRecommendation) => {
        const newDisplayedItems: any = {};
        rec.items.forEach(category => {
            newDisplayedItems[category] = pickRandomItem(category);
        });
        setDisplayedItems(newDisplayedItems);
    }, [pickRandomItem]);

    const handleGetRecommendation = useCallback(async (isManualRequest: boolean = false) => {
        if (!isManualRequest) {
            setIsLoading(true);
        } else {
             // Use a different loading state for manual button click if desired
        }
        setError(null);
        setRecommendation(null);
        setGeneratedOutfitImage(null);
        setOutfitError(null);
        setDisplayedItems({ Tops: null, Bottoms: null, Shoes: null, Accessories: null });
        
        try {
            const result = await getOutfitRecommendations(availableCategories, weather);
            setRecommendation(result);
            generateDisplayItems(result);
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [availableCategories, generateDisplayItems, weather]);

    useEffect(() => {
        if (availableCategories.length < 2) {
            setIsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // In a real app, you would replace this with a call to your backend
                    // that securely calls the weather API.
                    // For this example, we call it client-side.
                    if (WEATHER_API_KEY === 'YOUR_OPENWEATHERMAP_API_KEY') {
                        setWeatherError("Weather API key not configured. Cannot fetch weather data.");
                        await handleGetRecommendation(); // Get a generic recommendation
                        return;
                    }
                    
                    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=imperial&appid=${WEATHER_API_KEY}`);
                    if (!response.ok) {
                        throw new Error("Failed to fetch weather data.");
                    }
                    const data = await response.json();
                    const newWeather: WeatherInfo = {
                        temp: Math.round(data.main.temp),
                        description: data.weather[0].main,
                        icon: data.weather[0].icon,
                    };
                    setWeather(newWeather);
                } catch (err) {
                     setWeatherError("Could not fetch weather data. Providing a general suggestion.");
                     await handleGetRecommendation(); // Get recommendation without weather
                }
            },
            async (error) => {
                setWeatherError("Location access denied. Providing a general suggestion.");
                await handleGetRecommendation(); // Get recommendation without weather
            },
            { timeout: 10000 }
        );
    }, []); // Empty dependency array to run once on mount

    useEffect(() => {
        // This effect runs after weather state has been updated
        if (weather || weatherError) {
            handleGetRecommendation();
        }
    }, [weather, weatherError]);


    const handleShuffle = () => {
        if(recommendation) {
            generateDisplayItems(recommendation);
            setGeneratedOutfitImage(null);
            setOutfitError(null);
        }
    };

    const handleTryOnOutfit = async () => {
        if (!userImage || !recommendation) return;

        const itemsToTryOn = recommendation.items
            .map(category => displayedItems[category])
            .filter((item): item is ImageState => item !== null);
            
        if (itemsToTryOn.length === 0) {
            setOutfitError("No items to try on for this look.");
            return;
        }

        setIsGeneratingOutfit(true);
        setOutfitError(null);
        setGeneratedOutfitImage(null);

        try {
            const result = await generateOutfitTryOn(userImage, itemsToTryOn);
            setGeneratedOutfitImage(result);
        } catch (e) {
            if (e instanceof Error) {
                setOutfitError(e.message);
            } else {
                setOutfitError("An unexpected error occurred while generating the outfit.");
            }
        } finally {
            setIsGeneratingOutfit(false);
        }
    };
    
    const canGenerate = availableCategories.length >= 2;

    if (closet.length === 0) {
        return (
            <div className="text-center py-10 px-6">
                <h3 className="text-lg font-medium text-primary">Your Closet is Empty</h3>
                <p className="text-secondary mt-2">Add some clothes to your closet first to get personalized style advice.</p>
            </div>
        )
    }

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="text-center py-10">
                    <Spinner className="text-accent h-8 w-8 mx-auto" />
                    <p className="mt-4 text-secondary">Getting today's style inspiration...</p>
                </div>
            );
        }
        if (error) {
             return (
                <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-center" role="alert">
                    <p className="font-bold">Oops! Something went wrong.</p>
                    <p className="text-sm">{error}</p>
                </div>
            )
        }
        if (!recommendation) {
             return (
                 <div className="text-center py-10">
                    <p className="text-secondary">Click "Inspire Me!" to get a new outfit idea.</p>
                </div>
             );
        }
        return (
            <div className="mt-10 border-t pt-8 text-left animate-[fadeIn_0.5s_ease_in_out]">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-primary">{recommendation.outfitName}</h2>
                    <p className="mt-2 max-w-2xl mx-auto text-secondary">{recommendation.description}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {recommendation.items.map(category => {
                        const item = displayedItems[category];
                        return (
                            <div key={category} className="flex flex-col items-center text-center">
                                <h4 className="font-bold text-lg mb-2 text-primary">{category}</h4>
                                <div className="w-full h-64 bg-background rounded-lg flex items-center justify-center p-2 shadow-sm">
                                    {item ? (
                                        <img src={item.dataUrl ?? ''} alt={`Your ${category}`} className="max-h-full max-w-full object-contain rounded-md" />
                                    ) : (
                                        <span className="text-secondary text-sm">No item found in this category.</span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="mt-10 text-center">
                    <button
                        onClick={handleTryOnOutfit}
                        disabled={isGeneratingOutfit}
                        className={`w-full max-w-md inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors duration-300 ${
                            !isGeneratingOutfit
                                ? 'bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent'
                                : 'bg-gray-300 cursor-not-allowed'
                        }`}
                    >
                        {isGeneratingOutfit && <Spinner className="text-white mr-3" />}
                        {isGeneratingOutfit ? 'Creating Your Look...' : 'Try This Look On!'}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="text-center">
                <p className="text-secondary mb-2">Let our AI stylist create a unique outfit for you from your own closet!</p>
                {weather && (
                    <div className="flex items-center justify-center gap-2 text-secondary mb-4 p-2 bg-background rounded-lg">
                        <img src={`https://openweathermap.org/img/wn/${weather.icon}.png`} alt={weather.description} className="h-8 w-8" />
                        <span>Currently: {weather.temp}°F & {weather.description}</span>
                    </div>
                )}
                {weatherError && !weather && <p className="text-sm text-yellow-600 mb-4">{weatherError}</p>}
                
                <div className="flex justify-center items-center gap-4">
                    <button
                        onClick={() => handleGetRecommendation(true)}
                        disabled={!canGenerate || isLoading}
                        className={`w-full max-w-xs inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white transition-colors duration-300 ${
                            canGenerate && !isLoading
                                ? 'bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent'
                                : 'bg-gray-300 cursor-not-allowed'
                        }`}
                    >
                        {isLoading && <Spinner className="text-white mr-3"/>}
                        {isLoading ? 'Thinking...' : 'Inspire Me!'}
                    </button>
                    {recommendation && (
                        <button
                            onClick={handleShuffle}
                            disabled={isLoading}
                            className="p-3 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            title="Shuffle items for this look"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                        </button>
                    )}
                </div>
                
                {!canGenerate && <p className="text-sm text-yellow-600 mt-4">Please add items from at least two different categories to your closet to get recommendations.</p>}
                
                {renderContent()}

                {outfitError && (
                    <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-center" role="alert">
                        <p className="font-bold">Could not generate outfit</p>
                        <p className="text-sm">{outfitError}</p>
                    </div>
                )}

                {generatedOutfitImage && !isGeneratingOutfit && (
                    <div className="mt-10 border-t pt-8 animate-[fadeIn_0.5s_ease_in_out]">
                        <h2 className="text-2xl font-bold text-center text-primary mb-6">Here's Your Personalized Look!</h2>
                        <div className="flex flex-col items-center gap-6">
                            <div className="bg-background p-2 rounded-lg shadow-md">
                                <img src={generatedOutfitImage} alt="Generated virtual try-on of the full outfit" className="max-w-full h-auto max-h-[70vh] rounded-md object-contain" />
                            </div>
                            <div className="flex justify-center gap-3">
                                 <a 
                                  href={generatedOutfitImage} 
                                  download="ai-stylist-outfit.png"
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
                        </div>
                    </div>
                )}

            </div>
            {isModalOpen && generatedOutfitImage && (
                <ImageModal imageUrl={generatedOutfitImage} onClose={() => setIsModalOpen(false)} />
            )}
        </>
    );
};

export default StyleAdvisorView;