require('dotenv').config({ path: '.env.translation' });
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const translationsDir = path.join(__dirname, '../../translations');
const enFilePath = path.join(translationsDir, 'en.json');

const languageNames = {
    'cs.json': 'Czech',
    'de.json': 'German',
    'es.json': 'Spanish',
    'fr.json': 'French',
    'it.json': 'Italian',
    'ja.json': 'Japanese',
    'ko.json': 'Korean',
    'pt.json': 'Portuguese',
    'sk.json': 'Slovak',
    'zh.json': 'Chinese'
};

// Read source (english)
const enTranslations = JSON.parse(fs.readFileSync(enFilePath, 'utf8'));
const enKeys = Object.keys(enTranslations);

// Get all translation files
const translationFiles = fs.readdirSync(translationsDir)
  .filter(file => file.endsWith('.json') && file !== 'en.json')
  .sort();

console.log(`Found ${enKeys.length} keys in en.json\n`);
console.log('='.repeat(80));

async function translateMissingIds({file, translations, missingIds}){
    const languageName = languageNames[file];
    if (!languageName) {
        console.log(`No language name mapping for file: ${file}`);
        return;
    }

    // Build object with only missing translations
    const needed = {};
    missingIds.forEach(key => {
        needed[key] = enTranslations[key];
    });

    // Get all existing translations as style examples
    const existingTranslations = {};
    Object.keys(translations).forEach(key => {
        if (translations[key] && !translations[key].startsWith('***')) {
            existingTranslations[key] = {
                en: enTranslations[key],
                translated: translations[key]
            };
        }
    });

    const prompt = `You are a professional translator for DbGate, a database management application.

Translate the following English UI strings to ${languageName}.

IMPORTANT RULES:
1. Preserve ALL placeholders exactly as they appear: {plugin}, {columnNumber}, {0}, {1}, etc.
2. Maintain technical terminology appropriately for database software
3. Match the translation style, tone, and formality of the existing translations shown below
4. Keep the same level of brevity or verbosity as the existing translations
5. Return ONLY valid JSON - no markdown, no explanations, no code blocks
6. Use the same keys as provided

EXISTING TRANSLATIONS (for style reference):
${JSON.stringify(existingTranslations, null, 2)}

STRINGS TO TRANSLATE:
${JSON.stringify(needed, null, 2)}

Return format: {"key": "translated value", ...}`;

    const response = await client.chat.completions.create({
        model: 'gpt-5.1',
        messages: [
            { role: 'system', content: 'You are a professional translator specializing in software localization. Match the style and tone of existing translations. Return only valid JSON.' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.2
    });

    let translatedJson = response.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    translatedJson = translatedJson.replace(/^```json\n?/, '').replace(/\n?```$/, '');

    return JSON.parse(translatedJson);
}

(async () => {
    for (const file of translationFiles) {
        const filePath = path.join(translationsDir, file);
        const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        const missingIds = enKeys.filter(key => !translations.hasOwnProperty(key) || (typeof translations[key] === 'string' && translations[key].startsWith('***')));
        
  
        console.log(`\n${file.toUpperCase()}`);
        console.log('-'.repeat(80));
  
        if (missingIds.length === 0) {
            console.log('✓ All translations complete!');
            continue;
        } else {
            console.log(`Found ${missingIds.length} untranslated IDs\n`);
        }

        const newTranslations = await translateMissingIds({file, translations, missingIds});

        if (!newTranslations) {
            console.log(`Skipping file due to translation error: ${file}`);
            continue;
        }

        for (const [key, value] of Object.entries(newTranslations)) {
            translations[key] = value;
            console.log(`Translated: ${key} => ${value}`);
        }

        fs.writeFileSync(filePath, JSON.stringify(translations, null, 2) + '\n', 'utf8');
        console.log(`\n✓ Updated translations written to ${file}`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('Translation complete!\n');
})();
