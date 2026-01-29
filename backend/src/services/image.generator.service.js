import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import OpenAI from 'openai';
import env from '../config/env.js';

const CACHE_DIR = path.join(process.cwd(), 'public', 'images', 'cache');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: Number(env.OPENAI_TIMEOUT || 15000), // Images take longer
});

/**
 * Generates or retrieves an image for a given entity.
 * @param {string} type - 'suspect', 'city', 'artifact', 'villain'
 * @param {string} identifier - Unique ID or name
 * @param {string} description - Visual description
 * @returns {Promise<string>} - The public URL (e.g., /images/cache/xyz.png)
 */
export async function getEntityImage(type, identifier, description) {
  // Create a stable hash for the filename so we don't regenerate for the same entity ID
  const hash = crypto.createHash('md5').update(`${type}-${identifier}`).digest('hex');
  const filename = `${hash}.png`;
  const filePath = path.join(CACHE_DIR, filename);
  const publicUrl = `/images/cache/${filename}`;

  // 1. Check Cache
  if (fs.existsSync(filePath)) {
    return publicUrl;
  }

  // 2. Generate Image (if API key exists)
  if (env.OPENAI_API_KEY) {
    try {
      console.log(`[ImageService] Generating image for ${type} (${identifier})...`);
      const buffer = await generateImageWithAI(type, description);
      fs.writeFileSync(filePath, buffer);
      return publicUrl;
    } catch (error) {
      console.error(`[ImageService] AI Generation failed for ${identifier}:`, error.message);
      // Fallback proceeds below
    }
  }

  // 3. Fallback / Placeholder
  const fallbackSource = getFallbackImage(type);
  if (fs.existsSync(fallbackSource)) {
      // We copy the fallback to the cache so the frontend always sees a valid file at the specific URL
      // This allows us to "upgrade" it later by deleting the cache file if we want to regenerate
      fs.copyFileSync(fallbackSource, filePath);
      return publicUrl;
  }
  
  // Return a generic fallback URL if even the local fallback is missing
  return '/images/placeholder.png'; 
}

async function generateImageWithAI(type, description) {
  let systemPrompt = "High quality, distinct style.";
  
  // Style Definitions
  if (type === 'suspect' || type === 'villain') {
    systemPrompt = "Digital art style, character portrait, mugshot style, mysterious, Carmen Sandiego inspired art style, colorful.";
  } else if (type === 'city') {
    systemPrompt = "Travel poster style, wide shot, famous landmark, vibrant colors, vector art or stylized digital painting.";
  } else if (type === 'artifact') {
    systemPrompt = "Museum catalog photo, isolated object, clear details, neutral background.";
  }

  const prompt = `${systemPrompt} Subject: ${description}`;

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json",
  });

  const b64 = response.data[0].b64_json;
  return Buffer.from(b64, 'base64');
}

function getFallbackImage(type) {
  const base = path.join(process.cwd(), 'public', 'images');
  if (type === 'suspect' || type === 'villain') return path.join(base, 'suspect-placeholder.png');
  if (type === 'city') return path.join(base, 'city-placeholder.png');
  if (type === 'artifact') return path.join(base, 'artifact-placeholder.png');
  return path.join(base, 'placeholder.png');
}
