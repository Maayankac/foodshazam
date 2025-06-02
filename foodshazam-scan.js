require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const multer = require('multer');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 3000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json()); // הוספת json parser

app.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    const userId = req.body.user_id;
    if (!userId) {
      console.error('❌ חסר user_id בבקשה');
      return res.status(400).json({ error: 'user_id is required' });
    }

    const imagePath = req.file?.path;
    if (!imagePath) {
      console.error('❌ לא התקבלה תמונה');
      return res.status(400).json({ error: 'Image is required' });
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const completion = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "מהם המרכיבים במנה הזו? תן לי רשימה של מרכיבים בלבד." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      max_tokens: 300,
    });

    const ingredientsText = completion.choices[0]?.message?.content;
    if (!ingredientsText) {
      console.error('❌ לא התקבל טקסט מ-GPT');
      return res.status(500).json({ error: 'No ingredients from GPT' });
    }

    const ingredientsList = ingredientsText.split('\n').map(item => item.replace(/^\-|\d+\.?/, '').trim()).filter(Boolean);

    const { data: allergiesData, error: allergiesError } = await supabase
      .from('users')
      .select('allergies')
      .eq('id', userId)
      .single();

    if (allergiesError) {
      console.error('❌ שגיאה בשליפת אלרגיות:', allergiesError);
      return res.status(500).json({ error: 'Error fetching user allergies' });
    }

    if (!allergiesData) {
      console.error('❌ לא נמצאו נתוני משתמש עבור user_id:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const userAllergies = allergiesData.allergies || [];
    const foundAllergens = ingredientsList.filter(ingredient =>
      userAllergies.some(allergy => ingredient.toLowerCase().includes(allergy.toLowerCase()))
    );

    res.json({ ingredients: ingredientsList, allergens: foundAllergens });
    fs.unlinkSync(imagePath); // ניקוי הקובץ
  } catch (err) {
    console.error('❌ שגיאה בשרת:', err);
    res.status(500).json({ error: 'שגיאה פנימית בשרת' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
