const supabase = window.supabase.createClient(
    'https://kimdnostypcecnboxtyf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbWRub3N0eXBjZWNuYm94dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjMwODQsImV4cCI6MjA2MTM5OTA4NH0.CwJTYsEcmSPmvqTm9Jvt3sRzPcGuO9rZbCp2viZVyP4' // המפתח שלך
  );
  
  document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const container = document.getElementById('auth-container');
  
    if (user) {
      const { data, error } = await supabase
        .from('users')
        .select('full_name, email, diet_preference, allergies')
        .eq('id', user.id)
        .single();
  
      if (error) {
        console.error('שגיאה בשליפת פרטי המשתמש:', error);
        return;
      }
  
      container.innerHTML = `
        <div class="profile-container">
          <h2>👤 פרופיל משתמש</h2>
          <p><strong>שם מלא:</strong> ${data.full_name}</p>
          <p><strong>אימייל:</strong> ${data.email}</p>
          <p><strong>העדפת תזונה:</strong> ${data.diet_preference}</p>
          <p><strong>אלרגיות:</strong></p>
          <ul>
            ${data.allergies.map(a => `<li>${a}</li>`).join('')}
          </ul>
          <button id="logout-button">התנתקות</button>
        </div>
      `;
  
      document.getElementById('signupForm')?.classList.add('hidden'); // הסתרת טופס הרשמה אם קיים
  
      document.getElementById('logout-button').addEventListener('click', async () => {
        await supabase.auth.signOut();
        location.reload();
      });
    }
  });
  const { createClient } = supabase;
  const supabaseClient = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  const messageBox = document.getElementById('messageBox');
  const addAllergyButton = document.getElementById('addAllergyButton');
  const newAllergyInput = document.getElementById('newAllergyInput');
  const allergiesList = document.getElementById('allergies-list');

  addAllergyButton.addEventListener('click', () => {
    const newAllergy = newAllergyInput.value.trim();
    if (newAllergy !== '') {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'allergies';
      checkbox.value = newAllergy.toLowerCase().replace(/\s+/g, '_');
      checkbox.checked = true;
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + newAllergy));
      allergiesList.appendChild(label);
      newAllergyInput.value = '';
    }
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const dietPreference = document.getElementById('dietPreference').value;
    const allergies = Array.from(document.querySelectorAll('input[name="allergies"]:checked'))
      .map(checkbox => checkbox.value);

    const showMessage = (text, isError = false) => {
      messageBox.textContent = text;
      messageBox.className = isError ? 'error' : 'success';
      messageBox.classList.remove('hidden');
    };

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: null,
          data: {
            fullName,
            dietPreference,
            allergies
          }
        }
      });

      if (error) {
        console.error('Signup error:', error.message);
        showMessage('שגיאה בהרשמה: ' + error.message, true);
      } else {
        // שמירה בטבלת users
        const userId = data.user?.id;
console.log("User ID:", userId);
if (!userId) {
  console.error("לא התקבל מזהה משתמש מ-Supabase");
  return;
}

        await supabaseClient
          .from('users')
          .insert({
            id: userId,
            full_name: fullName,
            email: email,
            diet_preference: dietPreference,
            allergies: allergies
          });

        sessionStorage.setItem('fullName', fullName);
        window.location.href = 'foodshazma-home.html';
      }
    } catch (err) {
      console.error('Exception:', err);
      showMessage('שגיאה כללית בהרשמה.', true);
    }
  });
});
