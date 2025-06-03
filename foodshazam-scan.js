document.addEventListener('DOMContentLoaded', async () => {
  const supabaseUrl = 'https://kimdnostypcecnboxtyf.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbWRub3N0eXBjZWNuYm94dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjMwODQsImV4cCI6MjA2MTM5OTA4NH0.CwJTYsEcmSPmvqTm9Jvt3sRzPcGuO9rZbCp2viZVyP4'; // 🔒 החלף במפתח שלך
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  const cameraToggle = document.getElementById('camera-toggle');
  const camera = document.getElementById('camera');
  const captureButton = document.getElementById('capture-button');
  const fileInput = document.getElementById('file-input');
  const uploadBox = document.getElementById('upload-box');
  const previewImage = document.getElementById('preview-image');
  const previewElement = document.getElementById('preview');
  const messageBox = document.getElementById('messageBox');
  const canvas = document.getElementById('capture-canvas');
  const loadingSection = document.getElementById('loading-section');

  let stream, cameraActive = false, imageBlob = null;

  // קבלת session במקום רק getUser
  const { data: sessionData, error } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (user) {
    console.log('משתמש מחובר:', user.id);
    sessionStorage.setItem('userId', user.id);
  } else {
    console.warn('🟠 אין session פעיל או משתמש מחובר');
    showMessage('עליך להתחבר כדי לבצע סריקה', 'error');
    return; // הפסקת המשך טעינה
  }

  cameraToggle?.addEventListener('click', async () => {
    if (!cameraActive) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        camera.srcObject = stream;
        camera.style.display = 'block';
        cameraActive = true;
        captureButton.classList.remove('hidden');
      } catch (err) {
        showMessage('לא ניתן להפעיל מצלמה', 'error');
      }
    } else {
      stream.getTracks().forEach(track => track.stop());
      camera.srcObject = null;
      camera.style.display = 'none';
      cameraActive = false;
      captureButton.classList.add('hidden');
    }
  });

  captureButton?.addEventListener('click', () => {
    if (!cameraActive) return;
    const context = canvas.getContext('2d');
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;
    context.drawImage(camera, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      imageBlob = blob;
      previewImage.src = URL.createObjectURL(blob);
      previewElement.classList.remove('hidden');
      stream.getTracks().forEach(track => track.stop());
      cameraActive = false;
      processImage(blob);
    }, 'image/jpeg');
  });

  uploadBox?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      imageBlob = file;
      previewImage.src = URL.createObjectURL(file);
      previewElement.classList.remove('hidden');
      processImage(file);
    }
  });

async function processImage(blob) {
  showLoading();
  const formData = new FormData();
  formData.append('image', blob);
  formData.append('user_id', sessionStorage.getItem('userId') || '');

  try {
    const response = await fetch('/analyze-image', { method: 'POST', body: formData });
    if (!response.ok) throw new Error('שגיאה מהשרת');

    const { ingredients, allergens, totalCalories, imageUrl } = await response.json();

    // 🔥 הוספה: שמירת ההיסטוריה ב-Supabase
    const { error: insertError } = await supabase
      .from('history')
      .insert([{
        user_id: sessionStorage.getItem('userId'),
        image_url: imageUrl,
        total_calories: totalCalories,
        ingredients: JSON.stringify(ingredients),
        allergens: JSON.stringify(allergens),
        created_at: new Date().toISOString()
      }]);

    if (insertError) {
      console.error('שגיאה בהוספת פרטי התמונה להיסטוריה:', insertError.message);
    }

    // המשך העברה לדף התוצאות
    sessionStorage.setItem('ingredients', JSON.stringify(ingredients));
    sessionStorage.setItem('allergens', JSON.stringify(allergens));
    sessionStorage.setItem('totalCalories', totalCalories);
    sessionStorage.setItem('imageUrl', imageUrl);
    window.location.href = 'foodshazam-results.html';

  } catch (e) {
    showMessage('שגיאה כללית', 'error');
  } finally {
    hideLoading();
  }
}


  function showLoading() { loadingSection?.classList.remove('hidden'); }
  function hideLoading() { loadingSection?.classList.add('hidden'); }
  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = type === 'error' ? 'error' : 'success';
    messageBox.classList.remove('hidden');
  }
});
