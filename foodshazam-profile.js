// התחברות ל-Supabase
const supabase = window.supabase.createClient(
  'https://kimdnostypcecnboxtyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbWRub3N0eXBjZWNuYm94dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjMwODQsImV4cCI6MjA2MTM5OTA4NH0.CwJTYsEcmSPmvqTm9Jvt3sRzPcGuO9rZbCp2viZVyP4'
);

// פונקציה לטעינת הפרופיל ועריכה
window.renderUserProfile = async function() {
  const container = document.getElementById('auth-container');
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    container.innerHTML = '<p>שגיאה בטעינת המשתמש</p>';
    return;
  }

  const userId = authData.user.id;
  const { data, error } = await supabase
    .from('users')
    .select('full_name, email, diet_preference, allergies')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    container.innerHTML = '<p>שגיאה בטעינת הנתונים</p>';
    return;
  }

  container.innerHTML = `
    <div class="profile-container">
      <h2 class="form-title orange">פרופיל</h2>
      <div class="profile-field"><label>שם מלא</label><div class="field-box" id="display-fullname">${data.full_name || '---'}</div></div>
      <div class="profile-field"><label>אימייל</label><div class="field-box">${data.email}</div></div>
      <div class="profile-field"><label>העדפת תזונה</label><div class="field-box" id="display-diet">${data.diet_preference || '---'}</div></div>
      <div class="profile-field"><label>אלרגיות</label><div class="field-box allergy-box" id="display-allergies">${(data.allergies || []).join(', ')}</div></div>
      <button id="toggle-edit-button" class="edit-button">ערוך פרופיל ⬇️</button>
      <div id="edit-profile-wrapper" style="display: none;">
        <form id="edit-profile-form">
          <label>שם מלא:<input type="text" id="edit-fullname" value="${data.full_name || ''}" /></label>
          <label>העדפת תזונה:
            <select id="edit-diet">
              <option value="">בחר</option>
              <option value="vegan">טבעוני</option>
              <option value="vegetarian">צמחוני</option>
              <option value="omnivore">אוכל הכל</option>
              <option value="kosher">כשר</option>
              <option value="keto">קיטו</option>
              <option value="lactose_free">רגישות ללקטוז</option>
            </select>
          </label>
          <div>
            <p>אלרגיות:</p>
            <div id="edit-allergies-list"></div>
            <input type="text" id="new-edit-allergy" placeholder="הוסף אלרגיה" />
            <button type="button" id="add-edit-allergy">➕ הוסף</button>
          </div>
          <button type="submit">💾 שמור שינויים</button>
          <div id="edit-message" class="hidden"></div>
        </form>
      </div>
    </div>
  `;

  const editWrapper = document.getElementById('edit-profile-wrapper');
  const toggleBtn = document.getElementById('toggle-edit-button');
  toggleBtn.addEventListener('click', () => {
    const isHidden = editWrapper.style.display === 'none';
    editWrapper.style.display = isHidden ? 'block' : 'none';
    toggleBtn.textContent = isHidden ? 'ערוך פרופיל ⬆️' : 'ערוך פרופיל ⬇️';
  });

  const fullNameInput = document.getElementById('edit-fullname');
  const dietSelect = document.getElementById('edit-diet');
  dietSelect.value = data.diet_preference || '';
  const allergiesList = document.getElementById('edit-allergies-list');
  const newAllergyInput = document.getElementById('new-edit-allergy');
  const addAllergyButton = document.getElementById('add-edit-allergy');
  const editForm = document.getElementById('edit-profile-form');
  const messageBox = document.getElementById('edit-message');

  let currentAllergies = [...(data.allergies || [])];
  const renderAllergies = () => {
    allergiesList.innerHTML = '';
    currentAllergies.forEach((allergy) => {
      const label = document.createElement('label');
      label.style.display = 'block';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'allergies';
      checkbox.value = allergy;
      checkbox.checked = true;
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + allergy));
      allergiesList.appendChild(label);
    });
  };
  renderAllergies();

  addAllergyButton.addEventListener('click', () => {
    const newAllergy = newAllergyInput.value.trim().toLowerCase().replace(/\s+/g, '_');
    if (newAllergy && !currentAllergies.includes(newAllergy)) {
      currentAllergies.push(newAllergy);
      renderAllergies();
      newAllergyInput.value = '';
    }
  });

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updatedName = fullNameInput.value.trim();
    const updatedDiet = dietSelect.value;

    console.log("🔄 מעדכן משתמש:", userId);

  
    // שמירה: נקח את כל ה־checkboxים כולל החדשים מהפרונט
    const updatedAllergies = Array.from(document.querySelectorAll('#edit-allergies-list input[name="allergies"]'))
      .filter(cb => cb.checked)
      .map(cb => cb.value);
      console.log("🔄 נתונים לשמירה:", updatedName, updatedDiet, updatedAllergies);
    const { error } = await supabase
      .from('users')
      .update({
        full_name: updatedName,
        diet_preference: updatedDiet,
        allergies: updatedAllergies
      })
      .eq('id', userId);
  
    if (error) {
      messageBox.textContent = 'שגיאה בשמירת הנתונים: ' + error.message;
      messageBox.className = 'error';
    } else {
      // עדכון פרונט בלי לקרוא מחדש מה-DB
      document.getElementById('display-fullname').textContent = updatedName;
      document.getElementById('display-diet').textContent = updatedDiet;
      document.getElementById('display-allergies').textContent = updatedAllergies.join(', ');
  
      messageBox.textContent = 'הפרופיל עודכן בהצלחה!';
      messageBox.className = 'success';
      editWrapper.style.display = 'none';
      toggleBtn.textContent = 'ערוך פרופיל ⬇️';
    }
    messageBox.classList.remove('hidden');
  });
  
};
