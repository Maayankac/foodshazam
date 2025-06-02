// ניתוח תמונה
app.post('/analyze-image', upload.single('image'), async (req, res) => {
  const imagePath = req.file?.path;
  try {
    if (!imagePath) throw new Error('קובץ תמונה לא סופק.');

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "מהם המרכיבים במנה הזו? תן לי רשימה בפורמט JSON של [{\"name\": \"רכיב\", \"calories\": 100, \"confidence\": \"high\"}]" },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        }
      ],
      max_tokens: 1000,
    });

    const gptResponseText = completion.choices[0].message.content || '';
    console.log("🔎 טקסט מ-GPT:", gptResponseText);

    // ניתוח טקסט ל-ingredients
    let ingredientsList = [];
    try {
      const jsonMatch = gptResponseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        ingredientsList = JSON.parse(jsonMatch[0]);
      } else {
        console.warn('⚠️ GPT לא החזיר פורמט JSON, ניתוח רגיל');
        ingredientsList = gptResponseText.split('\n').map(line => {
          const match = line.match(/(.+?)([:\-]\s*(\d+)\s*calories)?/i);
          return {
            name: match ? match[1].trim() : line.trim(),
            calories: match && match[3] ? parseInt(match[3]) : 0,
            confidence: (line.includes('אופציונלי') || line.includes('אפשרי')) ? 'low' : 'high'
          };
        }).filter(i => i.name);
      }
    } catch (error) {
      console.warn('⚠️ שגיאה בפענוח JSON:', error);
      ingredientsList = [];
    }

    const totalCalories = ingredientsList.reduce((sum, item) => sum + (item.calories || 0), 0);

    const userId = req.body.user_id;
    if (!userId) throw new Error('לא סופק user_id בבקשה.');

    const { data: allergiesData, error: allergiesError } = await supabase
      .from('users')
      .select('allergies')
      .eq('id', userId)
      .single();

    if (allergiesError) throw allergiesError;

    const userAllergies = allergiesData?.allergies || [];
    const foundAllergens = ingredientsList.filter(ingredient =>
      userAllergies.some(allergy => ingredient.name.toLowerCase().includes(allergy.toLowerCase()))
    );

    // ⬇️⬇️ הוספת שמירה להיסטוריה
    const fileName = `food_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('images').upload(fileName, imageBuffer);
    if (uploadError) console.warn('⚠️ שגיאה בהעלאת תמונה:', uploadError);

    const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/images/${fileName}`;

    const { error: historyError } = await supabase.from('history').insert({
      user_id: userId,
      image_url: imageUrl,
      ingredients: ingredientsList,
      total_calories: totalCalories,
      allergens: foundAllergens,
      created_at: new Date().toISOString() // אופציונלי
    });

    if (historyError) console.error('❌ שגיאה בשמירת היסטוריה:', historyError);

    // תשובה ללקוח
    res.json({
      ingredients: ingredientsList,
      totalCalories,
      allergens: foundAllergens
    });

  } catch (err) {
    console.error('❌ שגיאה:', err);
    res.status(500).json({ error: err.message || 'שגיאה בניתוח התמונה' });
  } finally {
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  }
});
