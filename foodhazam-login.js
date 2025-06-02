const { createClient } = supabase;
// ✅ זה מה שצריך להיות בקוד שלך:
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const messageBox = document.getElementById('loginMessage');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // ניסיון התחברות
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("Login error:", error.message);
      messageBox.textContent = "שגיאה בהתחברות: " + error.message;
      messageBox.className = 'error';
      messageBox.classList.remove('hidden');
      return;
    }

    // שליפת שם מה-user_metadata
    const fullName = data.user.user_metadata?.fullName || 'משתמש';
    sessionStorage.setItem('fullName', fullName);

    // מעבר לדף הבית
    window.location.href = 'foodshazma-home.html';
  });
});
