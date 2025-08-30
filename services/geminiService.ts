import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import type { ImageState, ClothingCategory, OutfitRecommendation, WeatherInfo } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const getBase64FromImage = (image: { dataUrl?: string | null, base64?: string | null }): string => {
    if (image.base64) {
        return image.base64;
    }
    if (image.dataUrl) {
        const parts = image.dataUrl.split(',');
        if (parts.length === 2) {
            return parts[1];
        }
    }
    throw new Error("Could not extract base64 data from image state.");
};

interface AnalyzedClothingItem {
    processedImage: Omit<ImageState, 'id' | 'category' | 'name' | 'tags'>;
    name: string;
    tags: string[];
}


export const analyzeAndProcessClothingItem = async (
  image: Omit<ImageState, 'id' | 'category'>,
  category: ClothingCategory
): Promise<AnalyzedClothingItem> => {
    if (!image.mimeType) {
        throw new Error("Missing image mime type for processing.");
    }
    const imageBase64 = getBase64FromImage(image);

    const model = 'gemini-2.5-flash-image-preview';
    const imagePart = {
        inlineData: {
            data: imageBase64,
            mimeType: image.mimeType,
        },
    };
    const textPart = {
        text: `**Role:** You are a Clothing Isolation Expert.

**Primary Objective:** Your ONLY job is to perfectly isolate a single clothing item from the user's image based on the provided category, remove the background, and return metadata about it.

**Category Provided by User:** '${category}'

---

**JOB 1: IMAGE PROCESSING (Strict Rules)**

*   **Isolate Garment:** Find the single clothing item that matches the user's category ('${category}') and create a tight crop around it.
*   **Remove Background:** The final image background MUST be 100% transparent.
*   **Remove Body Parts:** You MUST remove all human body parts (arms, legs, torso, etc.). The final image must contain ONLY the garment, as if on an invisible mannequin.
*   **CRITICAL NEGATIVE CONSTRAINT:** **DO NOT** generate any other objects. The output image **MUST NOT** contain animals, vehicles, scenery, abstract shapes, or any item that is not the specified piece of clothing. If you cannot isolate the clothing, return an error; do not invent an object.

---

**JOB 2: METADATA GENERATION**

*   **Name:** Create a descriptive, concise name for the item (e.g., "Classic White T-Shirt").
*   **Tags:** Generate a list of 3-5 relevant, lowercase tags (e.g., "white", "cotton", "casual").

---

**CRUCIAL OUTPUT INSTRUCTIONS**

*   Your response MUST have exactly two parts.
*   **Part 1:** The processed PNG image with the transparent background.
*   **Part 2:** A single, minified JSON object in the text part. The JSON must have this exact structure: \`{"name": "...", "tags": ["..."]}\`. Do not add any other text or markdown like \`\`\`json.
*   **Example JSON:** \`{"name":"Vintage Blue Denim Jacket","tags":["blue","denim","jacket","casual"]}\``,
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts || response.candidates[0].content.parts.length < 2) {
             const safetyFeedback = response.candidates?.[0]?.safetyRatings;
             if (safetyFeedback) {
                const blockedCategories = safetyFeedback.filter(r => r.blocked).map(r => r.category).join(', ');
                if (blockedCategories) {
                     throw new Error(`The request was blocked for safety reasons related to: ${blockedCategories}.`);
                }
             }
            throw new Error("The model did not return a valid response during image processing.");
        }

        let processedImage: Omit<ImageState, 'id' | 'category' | 'name' | 'tags'> | null = null;
        let metadata: { name: string, tags: string[] } | null = null;

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.mimeType.includes('image')) {
                const mimeType = 'image/png';
                const base64 = part.inlineData.data;
                const dataUrl = `data:${mimeType};base64,${base64}`;
                processedImage = { base64, dataUrl, mimeType, file: null };
            } else if (part.text) {
                try {
                     const cleanedText = part.text.replace(/```json|```/g, '').trim();
                     metadata = JSON.parse(cleanedText);
                } catch(e) {
                     console.warn("Failed to parse JSON metadata from model response text part:", part.text);
                }
            }
        }
        
        if (processedImage && metadata) {
            return { processedImage, name: metadata.name, tags: metadata.tags };
        }
        
        throw new Error("The model response was incomplete. It did not provide both a valid image and the required metadata.");

    } catch (error) {
        console.error("Error processing clothing item:", error);
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("An unknown error occurred during image processing.");
    }
};

export const generateOutfitTryOn = async (
    bodyImage: ImageState,
    clothingItems: ImageState[]
): Promise<string> => {
    if (!bodyImage.mimeType) {
        throw new Error("Missing body image mime type for generation.");
    }
    if (clothingItems.length === 0) {
        throw new Error("No clothing items provided for try-on.");
    }
    
    const bodyImageBase64 = getBase64FromImage(bodyImage);
    const model = 'gemini-2.5-flash-image-preview';

    const bodyImagePart = {
        inlineData: { data: bodyImageBase64, mimeType: bodyImage.mimeType },
    };

    const clothingParts = clothingItems.map(item => {
        if(!item.mimeType) {
             throw new Error(`Clothing item with id ${item.id} is missing mime type.`);
        }
        return {
            inlineData: { data: getBase64FromImage(item), mimeType: item.mimeType },
        }
    });
    
    const textPart = {
        text: `**Role:** You are an expert virtual stylist and photo editor.

**Task:** Create a photorealistic image of a person wearing a new outfit. You will be given one image of the person (the model) and one or more images of clothing items with transparent backgrounds.

**Input:**
- **Image 1:** The person (model).
- **Subsequent Images:** Clothing items (e.g., shirt, pants, shoes).

**Strict Rules for Output Image:**
1.  **Preserve Identity:** The person's face, hair, body shape, and pose MUST remain identical to the original photo. Do not alter their appearance in any way.
2.  **Maintain Background:** The background of the original photo MUST be used in the final image without any changes or alterations.
3.  **Realistic Fit:** Dress the person in the provided clothing items. The clothes should fit naturally. Pay close attention to:
    *   **Draping:** How the fabric hangs and folds on the body.
    *   **Lighting & Shadows:** Ensure the lighting on the clothes matches the lighting in the original photo. Add realistic shadows where the clothes create them (e.g., under the collar, folds in the fabric).
    *   **Layering:** If multiple items are provided (e.g., shirt and jacket), layer them correctly.
4.  **Crucial - No Cropping:** The output image's dimensions, aspect ratio, and framing MUST be identical to the original person's photo. Do not zoom in or crop the image in any way. The entire person must be visible as they were in the original.
5.  **Final Output:** Generate a single, new, high-quality image showing the final result. Do not output any text.`,
    };

    const allParts = [bodyImagePart, ...clothingParts, textPart];

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: { parts: allParts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts) {
            throw new Error("The model did not return a valid response for the outfit try-on.");
        }

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("The model did not return a generated outfit image.");
    } catch (error) {
        console.error("Error generating outfit try-on:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate outfit: ${error.message}`);
        }
        throw new Error("An unknown error occurred during outfit generation.");
    }
};

export const editGeneratedImage = async (
    baseImage: Omit<ImageState, 'id'>,
    prompt: string
): Promise<string> => {
    if (!baseImage.mimeType) {
        throw new Error("Missing base image mime type for editing.");
    }
    const imageBase64 = getBase64FromImage(baseImage);
    const model = 'gemini-2.5-flash-image-preview';

    const imagePart = {
        inlineData: { data: imageBase64, mimeType: baseImage.mimeType },
    };
    
    const textPart = {
        text: `**Role:** You are a magic photo editor.
            
**Task:** You will receive an image and a text instruction. Your job is to apply the change described in the text to the image, and nothing else.

**Strict Rules:**
1.  **Minimal Change:** Only apply the specific edit requested in the prompt.
2.  **Preserve Everything Else:** The rest of the image, including the person, clothing, quality, and style, must remain IDENTICAL.
3.  **Seamless Integration:** The edit must be photorealistic and seamlessly integrated.

**User's Edit Request:** "${prompt}"

**Output:** Return only the newly edited image. Do not output any text.`
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        if (!response.candidates || response.candidates.length === 0 || !response.candidates[0].content || !response.candidates[0].content.parts) {
            throw new Error("The model did not return a valid response for the image edit.");
        }

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        throw new Error("The model did not return an edited image.");
    } catch (error) {
        console.error("Error editing generated image:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to edit image: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image editing.");
    }
};


export const getOutfitRecommendations = async (
  availableCategories: ClothingCategory[],
  weather?: WeatherInfo | null,
): Promise<OutfitRecommendation> => {
  if (availableCategories.length < 2) {
    throw new Error("Please add items from at least two different categories to your closet to get outfit recommendations.");
  }

  const model = 'gemini-2.5-flash';
  
  const weatherContext = weather
    ? `The current weather is ${weather.temp}°F and ${weather.description}.`
    : '';

  const prompt = `You are a fashion expert. A user has the following types of clothes in their virtual closet: ${availableCategories.join(', ')}.
  ${weatherContext}
  
  Create one stylish outfit combination that is appropriate for the current context.
  - The outfit must use at least two different categories from the provided list.
  - Describe the outfit, its style, and why it works.
  - Specify which categories of items are needed for the outfit.
  
  Respond ONLY with a JSON object that strictly follows the provided schema.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            outfitName: { type: Type.STRING, description: "A catchy name for the outfit style." },
            description: { type: Type.STRING, description: "A brief description of the outfit, its style, and what occasion it's for." },
            items: {
              type: Type.ARRAY,
              description: "A list of clothing categories needed for this outfit.",
              items: {
                type: Type.STRING,
                enum: availableCategories,
              }
            }
          },
          required: ["outfitName", "description", "items"],
        }
      }
    });

    const jsonText = response.text;
    const parsedJson = JSON.parse(jsonText);

    if (!parsedJson.items || parsedJson.items.length === 0) {
      throw new Error("The model did not suggest any items for the outfit.");
    }

    return parsedJson as OutfitRecommendation;
    
  } catch (error) {
    console.error("Error generating outfit recommendation:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to get recommendation: ${error.message}`);
    }
    throw new Error("An unknown error occurred while getting outfit recommendations.");
  }
};