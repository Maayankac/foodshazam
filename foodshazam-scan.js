document.addEventListener('DOMContentLoaded', () => {
  const ingredients = JSON.parse(sessionStorage.getItem('ingredients') || '[]');
  const allergens = JSON.parse(sessionStorage.getItem('allergens') || '[]');
  const imageUrl = sessionStorage.getItem('imageUrl') || '';
  const totalCalories = +sessionStorage.getItem('totalCalories') || 0;

  const scannedImage = document.getElementById('scanned-image');
  const ingredientsListEl = document.getElementById('ingredients-list');
  const totalCaloriesEl = document.getElementById('total-calories');
  const caloriesSummaryEl = document.getElementById('calories-summary');
  const allergensListEl = document.getElementById('allergens-list');
  const allergyWarningEl = document.getElementById('allergy-warning');
  const noAllergensEl = document.getElementById('no-allergens');

  if (imageUrl) {
    scannedImage.src = imageUrl;
  } else {
    scannedImage.alt = 'לא קיימת תמונה להצגה';
  }

  // הצגת מרכיבים
  ingredientsListEl.innerHTML = '';
  ingredients.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.name || item}: ${item.calories || 0} קלוריות`;
    ingredientsListEl.appendChild(li);
  });

  // הצגת קלוריות
  if (ingredients.length > 0) {
    caloriesSummaryEl.classList.remove('hidden');
    totalCaloriesEl.textContent = totalCalories;
  }

  // הצגת אלרגנים
  if (allergens.length > 0) {
    allergyWarningEl.classList.remove('hidden');
    noAllergensEl.classList.add('hidden');
    allergensListEl.innerHTML = '';
    allergens.forEach(a => {
      const li = document.createElement('li');
      li.textContent = a;
      li.style.color = 'red';
      li.style.fontWeight = 'bold';
      allergensListEl.appendChild(li);
    });
  } else {
    allergyWarningEl.classList.add('hidden');
    noAllergensEl.classList.remove('hidden');
  }
});
