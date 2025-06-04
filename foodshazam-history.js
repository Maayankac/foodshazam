document.addEventListener('DOMContentLoaded', async () => {
  const supabase = window.supabase.createClient(
    'https://kimdnostypcecnboxtyf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbWRub3N0eXBjZWNuYm94dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjMwODQsImV4cCI6MjA2MTM5OTA4NH0.CwJTYsEcmSPmvqTm9Jvt3sRzPcGuO9rZbCp2viZVyP4'
  );

  const container = document.getElementById('history-container');
  const popup = document.getElementById('popup');
  const popupImage = document.getElementById('popup-image');
  const popupCalories = document.getElementById('popup-calories');
  const popupIngredients = document.getElementById('popup-ingredients');
  const popupAllergens = document.getElementById('popup-allergens');
  const closePopup = document.getElementById('close-popup');

  const allergenMap = {
    "שומשום": ["שומשום", "sesame", "sesame seeds"],
    "בוטנים": ["בוטנים", "peanut", "peanuts", "peanut sauce"],
    "חלב": ["חלב", "milk", "dairy", "lactose"],
    "סויה": ["סויה", "soy", "soybeans", "soy sauce"],
    "ביצים": ["ביצים", "eggs", "egg"],
    "גלוטן": ["גלוטן", "gluten", "wheat"],
    "שקדים": ["שקדים", "almonds", "almond"],
    "אגוזים": ["אגוזים", "nuts", "walnuts", "pecan", "cashew", "hazelnut"],
    "דגים": ["דגים", "fish", "salmon", "tuna"],
    "פירות ים": ["פירות ים", "seafood", "shrimp", "crab", "shellfish"]
  };

  function isAllergen(ingredientName, allergen) {
    const synonyms = allergenMap[allergen] || [allergen];
    return synonyms.some(syn => {
      if (typeof syn !== 'string') return false;
      return ingredientName.toLowerCase().includes(syn.toLowerCase());
    });
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) {
    container.innerHTML = '<p>יש להתחבר כדי לראות את היסטוריית הסריקות.</p>';
    return;
  }

  const { data: historyData, error: fetchError } = await supabase
    .from('history')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (fetchError || !historyData || historyData.length === 0) {
    container.innerHTML = '<p>לא נמצאה היסטוריה עבור משתמש זה.</p>';
    return;
  }

  historyData.forEach(entry => {
    const img = document.createElement('img');
    img.src = entry.image_url;
    img.className = 'history-thumbnail';
    img.alt = 'תמונה מהיסטוריית סריקה';

    img.addEventListener('click', () => {
      popupImage.src = entry.image_url;
      popupCalories.textContent = `${entry.total_calories} קק"ל`;
      popupIngredients.innerHTML = '';
      popupAllergens.innerHTML = '';

      const ingredients = typeof entry.ingredients === 'string' ? JSON.parse(entry.ingredients) : entry.ingredients;
      const allergens = typeof entry.allergens === 'string' ? JSON.parse(entry.allergens) : entry.allergens;

      ingredients?.forEach(i => {
        const li = document.createElement('li');
        li.textContent = `${i.name}: ${i.calories} קלוריות`;
        if (allergens?.some(a => isAllergen(i.name, a))) {
          li.style.color = 'red';
          li.style.fontWeight = 'bold';
          li.innerHTML = '⚠️ ' + li.textContent;
        }
        popupIngredients.appendChild(li);
      });

      if (allergens?.length > 0) {
        const header = document.createElement('h4');
        header.textContent = 'אלרגנים:';
        popupAllergens.appendChild(header);

allergens.forEach(a => {
  const li = document.createElement('li');
  const allergenName = typeof a === 'object' && a !== null ? a.name : a;
  li.textContent = '⚠️ ' + allergenName;
  li.style.color = 'red';
  popupAllergens.appendChild(li);
});
        allergens.forEach(a => {
          const li = document.createElement('li');
          li.textContent = '⚠️ ' + a;
          li.style.color = 'red';
          popupAllergens.appendChild(li);
        });
      }

      popup.classList.remove('hidden');
    });

    container.appendChild(img);
  });

  closePopup.addEventListener('click', () => {
    popup.classList.add('hidden');
  });
});
