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
  
    // 🧠 קבלת המשתמש המחובר
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!user) {
      container.innerHTML = '<p>יש להתחבר כדי לראות את היסטוריית הסריקות.</p>';
      return;
    }
  
    // 📥 שליפת ההיסטוריה עבור המשתמש בלבד
    const { data: historyData, error: fetchError } = await supabase
      .from('history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
  
    if (fetchError || !historyData || historyData.length === 0) {
      container.innerHTML = '<p>לא נמצאה היסטוריה עבור משתמש זה.</p>';
      return;
    }
  
    // ✅ הצגת התמונות והפופאפ
    historyData.forEach(entry => {
      const img = document.createElement('img');
      img.src = entry.image_url;
      img.className = 'history-thumbnail';
      img.alt = 'תמונה מהיסטוריית סריקה';
  
      img.addEventListener('click', () => {
        popupImage.src = entry.image_url;
        popupCalories.textContent = entry.total_calories + ' קק\"ל';
        popupIngredients.innerHTML = '';
        popupAllergens.innerHTML = '';
  
        entry.ingredients?.forEach(i => {
          const li = document.createElement('li');
          li.textContent = `${i.name}: ${i.calories} קלוריות`;
          if (entry.allergens?.some(a => i.name.toLowerCase().includes(a.toLowerCase()))) {
            li.style.color = 'red';
            li.style.fontWeight = 'bold';
            li.innerHTML = '⚠️ ' + li.textContent;
          }
          popupIngredients.appendChild(li);
        });
  
        entry.allergens?.forEach(a => {
          const li = document.createElement('li');
          li.textContent = '⚠️ ' + a;
          li.style.color = 'red';
          popupAllergens.appendChild(li);
        });
  
        popup.classList.remove('hidden');
      });
  
      container.appendChild(img);
    });
  
    // סגירת הפופאפ
    closePopup.addEventListener('click', () => {
      popup.classList.add('hidden');
    });
  });
  