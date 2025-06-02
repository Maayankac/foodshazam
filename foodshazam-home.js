// ✅ זה מה שצריך להיות בקוד שלך:
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
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
