const supabase = window.supabase.createClient(
  'https://kimdnostypcecnboxtyf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbWRub3N0eXBjZWNuYm94dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjMwODQsImV4cCI6MjA2MTM5OTA4NH0.CwJTYsEcmSPmvqTm9Jvt3sRzPcGuO9rZbCp2viZVyP4'
);

document.addEventListener('DOMContentLoaded', async () => {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.warn('🟠 שגיאה או אין משתמש מחובר');
    const profileContainer = document.querySelector('.profile-container');
    if (profileContainer) {
      profileContainer.innerHTML = '<p>לא נמצאו פרטי משתמש</p>';
    }
    return;
  }

  const { data, error: dataError } = await supabase
    .from('users')
    .select('full_name, email, diet_preference, allergies')
    .eq('id', user.id)
    .maybeSingle();

  if (dataError || !data) {
    console.error('שגיאה בטעינת הנתונים:', dataError?.message);
    const profileContainer = document.querySelector('.profile-container');
    if (profileContainer) {
      profileContainer.innerHTML = '<p>שגיאה בטעינת הנתונים</p>';
    }
    return;
  }

  // עדכון פרטי פרופיל
  document.getElementById('profile-name').textContent = data.full_name || '---';
  document.getElementById('profile-email').textContent = data.email || '---';
  document.getElementById('profile-diet').textContent = data.diet_preference || '---';
  document.getElementById('profile-allergies').textContent = (data.allergies || []).join(', ') || '---';

  // כפתור עריכה
  const toggleEditButton = document.getElementById('toggle-edit-button');
  const editWrapper = document.getElementById('edit-profile-form');
  if (toggleEditButton && editWrapper) {
    toggleEditButton.addEventListener('click', () => {
      const isHidden = editWrapper.style.display === 'none' || !editWrapper.style.display;
      editWrapper.style.display = isHidden ? 'block' : 'none';
      toggleEditButton.textContent = isHidden ? 'ערוך פרופיל ⬆️' : 'ערוך פרופיל ⬇️';
    });
  }

  // שדות עריכה
  const fullNameInput = document.getElementById('edit-fullname');
  const dietSelect = document.getElementById('edit-diet');
  const allergiesList = document.getElementById('edit-allergies-list');
  const newAllergyInput = document.getElementById('new-edit-allergy');
  const addAllergyButton = document.getElementById('add-edit-allergy');
  const editForm = document.getElementById('edit-profile-form');
  const messageBox = document.getElementById('edit-message');

  if (fullNameInput && dietSelect && allergiesList) {
    fullNameInput.value = data.full_name || '';
    dietSelect.value = data.diet_preference || '';
    let currentAllergies = [...(data.allergies || [])];

    const renderAllergies = () => {
      allergiesList.innerHTML = '';
      currentAllergies.forEach(a => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'allergies';
        checkbox.value = a;
        checkbox.checked = true;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + a));
        allergiesList.appendChild(label);
      });
    };
    renderAllergies();

    if (addAllergyButton && newAllergyInput) {
      addAllergyButton.addEventListener('click', () => {
        const newAllergy = newAllergyInput.value.trim().toLowerCase();
        if (newAllergy && !currentAllergies.includes(newAllergy)) {
          currentAllergies.push(newAllergy);
          renderAllergies();
          newAllergyInput.value = '';
        }
      });
    }

    if (editForm && messageBox) {
      editForm.addEventListener('submit', async e => {
        e.preventDefault();
        const updatedName = fullNameInput.value.trim();
        const updatedDiet = dietSelect.value;
        const updatedAllergies = Array.from(document.querySelectorAll('#edit-allergies-list input[name="allergies"]:checked'))
          .map(cb => cb.value);

        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: updatedName,
            diet_preference: updatedDiet,
            allergies: updatedAllergies
          })
          .eq('id', user.id);

        if (updateError) {
          messageBox.textContent = 'שגיאה בשמירת הנתונים: ' + updateError.message;
          messageBox.className = 'error';
        } else {
          document.getElementById('profile-name').textContent = updatedName;
          document.getElementById('profile-diet').textContent = updatedDiet || '---';
          document.getElementById('profile-allergies').textContent = updatedAllergies.join(', ') || '---';
          messageBox.textContent = 'הפרופיל עודכן בהצלחה!';
          messageBox.className = 'success';
          editWrapper.style.display = 'none';
          toggleEditButton.textContent = 'ערוך פרופיל ⬇️';
        }
        messageBox.classList.remove('hidden');
      });
    }
  }
});
