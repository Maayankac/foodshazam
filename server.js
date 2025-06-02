require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const multer = require('multer');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 3000;

// יצירת לקוח Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// יצירת לקוח OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 🏠 הגשת כל הקבצים הסטטיים (HTML, CSS, JS וכו')
app.use(express.static(path.join(__dirname, '.')));

// הגדרת ברירת מחדל לדף הבית
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'foodshazma-home.html'));
});

// 🚀 נקודת קצה לניתוח תמונה
app.post('/analyze-image', upload.single('image'), async (req, res) => {
    try {
        const imagePath = req.file.path;

        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');

        const completion = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "מהם המרכיבים במנה הזו? תן לי רשימה של מרכיבים בלבד." },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
                    ],
                }
            ],
            max_tokens: 300,
        });

        const ingredientsText = completion.choices[0].message.content;
        const ingredientsList = ingredientsText
            .split('\n')
            .map(item => item.replace(/^\-|\d+\.?/, '').trim())
            .filter(Boolean);

        // שליפת אלרגיות המשתמש
        const { data: allergiesData, error: allergiesError } = await supabase
            .from('users')
            .select('allergies')
            .eq('id', req.body.user_id)
            .single();

        if (allergiesError) throw allergiesError;

        const userAllergies = allergiesData.allergies || [];
        const foundAllergens = ingredientsList.filter(ingredient =>
            userAllergies.some(allergy => ingredient.toLowerCase().includes(allergy.toLowerCase()))
        );

        res.json({
            ingredients: ingredientsList,
            allergens: foundAllergens,
        });

        fs.unlinkSync(imagePath);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'שגיאה בניתוח התמונה' });
    }
});

// 🚀 הפעלת השרת
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});
