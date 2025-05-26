function initSignupFormHandlers() {
  const supabase = window._supabaseClient; // ← חיבור נכון ללקוח Supabase

  const signupForm = document.getElementById('signupForm');
  const messageBox = document.getElementById('messageBox');
  const addAllergyButton = document.getElementById('addAllergyButton');
  const newAllergyInput = document.getElementById('newAllergyInput');
  const allergiesList = document.getElementById('allergies-list');

  if (addAllergyButton && newAllergyInput && allergiesList) {
    addAllergyButton.addEventListener('click', () => {
      const newAllergy = newAllergyInput.value.trim();
      if (newAllergy !== '') {
        const label = document.createElement('label');
        label.style.display = 'block';
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
  }

  if (signupForm) {
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
        const { data, error } = await supabase.auth.signUp({
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
          const userId = data.user?.id;
          if (!userId) {
            console.error("לא התקבל מזהה משתמש מ-Supabase");
            showMessage("שגיאה: לא ניתן לאחסן את פרטי המשתמש.", true);
            return;
          }

          console.log("👤 נרשם בהצלחה, userId:", userId);

          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          if (!existingUser) {
            await supabase
              .from('users')
              .insert({
                id: userId,
                full_name: fullName,
                email: email,
                diet_preference: dietPreference,
                allergies: allergies
              });
          } else {
            console.warn('⚠️ משתמש כבר קיים עם ID זה בטבלה.');
          }

          sessionStorage.setItem('fullName', fullName);
          window.location.href = 'foodshazma-home.html';
        }
      } catch (err) {
        console.error('Exception:', err);
        showMessage('שגיאה כללית בהרשמה.', true);
      }
    });
  }
}
