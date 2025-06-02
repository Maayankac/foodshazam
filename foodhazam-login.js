const { createClient } = supabase;
const supabaseUrl = 'https://kimdnostypcecnboxtyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbWRub3N0eXBjZWNuYm94dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjMwODQsImV4cCI6MjA2MTM5OTA4NH0.CwJTYsEcmSPmvqTm9Jvt3sRzPcGuO9rZbCp2viZVyP4'; // Supabase anon key בלבד
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

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
