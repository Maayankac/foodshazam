const supabaseUrl = 'https://kimdnostypcecnboxtyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbWRub3N0eXBjZWNuYm94dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjMwODQsImV4cCI6MjA2MTM5OTA4NH0.CwJTYsEcmSPmvqTm9Jvt3sRzPcGuO9rZbCp2viZVyP4'; // Supabase anon key בלבד
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
  const welcomeMessage = document.getElementById('welcomeMessage');
  const logoutButton = document.getElementById('logoutButton');

  // מציג את השם אם קיים ב-sessionStorage
  const fullName = sessionStorage.getItem('fullName');
  if (fullName) {
    welcomeMessage.textContent = `שלום ${fullName}!`;
  }

  // לחיצה על התנתק
  logoutButton?.addEventListener('click', async () => {
    await supabase.auth.signOut(); // ניתוק מהשרת
    sessionStorage.removeItem('fullName'); // הסרת השם
    welcomeMessage.textContent = 'שלום!'; // הצגת ברירת מחדל
  });
});
