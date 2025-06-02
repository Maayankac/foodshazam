require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const multer = require('multer');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });
const port = process.env.PORT || 3000;
app.use(express.static(__dirname));

// התחברות ל-Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// התחברות ל-OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const path = require('path');
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'foodshazma-home.html'));
});

app.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file.path;

    // 1. שליחת התמונה ל-GPT
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "מהם המרכיבים במנה הזו? תן לי רשימה של מרכיבים בלבד." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        }
      ],
      max_tokens: 300,
    });

    const gptResponseText = completion.choices[0].message.content;
    console.log("🔎 טקסט מ-GPT:", gptResponseText);
    
    // חיפוש מבנה JSON בתוך הטקסט
    let ingredientsList = [];
    try {
      const jsonMatch = gptResponseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        ingredientsList = JSON.parse(jsonMatch[0]);
      } else {
        // fallback: פירוק שורות אם אין JSON
        ingredientsList = gptResponseText
          .split('\n')
          .map(item => ({
            name: item.replace(/^\-|\d+\.?/, '').trim(),
            calories: null,
            confidence: 'maybe'
          }))
          .filter(i => i.name);
      }
    } catch (error) {
      console.warn('⚠️ שגיאה בפענוח JSON:', error);
      ingredientsList = [];
    }
    

    // 2. שליפת אלרגיות המשתמש
    const { data: allergiesData, error: allergiesError } = await supabase
      .from('users')
      .select('allergies')
      .eq('id', req.body.user_id)
      .single();

    if (allergiesError) throw allergiesError;

    const userAllergies = allergiesData.allergies || [];

    // 3. השוואה לאלרגנים
    const foundAllergens = ingredientsList.filter(ingredient =>
      userAllergies.some(allergy => ingredient.toLowerCase().includes(allergy.toLowerCase()))
    );

    // 4. החזרת תוצאה ללקוח
    res.json({
      ingredients: ingredientsList,
      allergens: foundAllergens,
    });

    fs.unlinkSync(imagePath); // מחיקת הקובץ אחרי שימוש
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בניתוח התמונה' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
