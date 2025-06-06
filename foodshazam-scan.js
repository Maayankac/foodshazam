document.addEventListener('DOMContentLoaded', async () => {
  const supabaseUrl = 'https://kimdnostypcecnboxtyf.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbWRub3N0eXBjZWNuYm94dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjMwODQsImV4cCI6MjA2MTM5OTA4NH0.CwJTYsEcmSPmvqTm9Jvt3sRzPcGuO9rZbCp2viZVyP4';
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

  const { data: sessionData, error } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;

  if (!user) {
    console.warn('🟠 אין משתמש מחובר');
    showMessage('עליך להתחבר כדי לבצע סריקה', 'error');
    return;
  }

  console.log("✅ user.id:", user.id);
  sessionStorage.setItem('userId', user.id);

  cameraToggle?.addEventListener('click', async () => {
    if (!cameraActive) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        camera.srcObject = stream;
        camera.style.display = 'block';
        cameraActive = true;
        captureButton.classList.remove('hidden');
      } catch {
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
  formData.append('user_id', user.id);

  try {
    const response = await fetch('/analyze-image', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('שגיאה מהשרת');

    const { ingredients, allergens: rawAllergens, totalCalories, imageUrl } = await response.json();

    // שלב 1: קבלת אלרגיות המשתמש
    const { data: userData } = await supabase
      .from('users')
      .select('allergies')
      .eq('id', user.id)
      .single();

    const userAllergies = typeof userData?.allergies === 'string'
      ? userData.allergies.split(',').map(a => a.trim().toLowerCase())
      : (userData?.allergies || []).map(a => a.trim().toLowerCase());

    // שלב 2: נירמול
    const allergenSynonyms = {
"שומשום": ["שומשום", "sesame", "sesame seeds", "tahini", "טחינה", "סומסום"],
  "בוטנים": ["בוטנים", "peanut", "peanuts", "peanut butter", "peanut sauce", "חמאת בוטנים"],
  "חלב": ["חלב", "milk", "dairy", "lactose", "גבינה", "שמנת", "יוגורט", "קוטג'", "קפיר", "butter", "cream", "cheese", "mozzarella", "פרמזן", "ברי", "קממבר"],
  "סויה": ["סויה", "soy", "soybeans", "soy sauce", "tofu", "edamame", "חלב סויה", "רוטב סויה"],
  "ביצים": ["ביצים", "egg", "eggs", "omelette", "omelet", "egg yolk", "egg whites", "חלמון", "חלבון", "מיונז", "mayonnaise", "quiche"],
  "גלוטן": ["גלוטן", "gluten", "wheat", "קמח", "לחם", "סולת", "שיבולת שועל", "oats", "פסטה", "crackers", "בולגר", "semolina", "breadcrumbs", "לחמניה","בצק פיצה"],
  "שקדים": ["שקדים", "almond", "almonds", "almond milk", "almond flour", "מרציפן", "שקדיה"],
  "אגוזים": ["אגוזים", "nuts", "walnuts", "pecans", "hazelnuts", "cashews", "macadamia", "pistachio", "nutella", "מקדמיה", "פיסטוק", "אגוז לוז", "אגוזי מלך"],
  "דגים": ["דגים", "fish", "tuna", "salmon", "cod", "דניס", "בורי", "סלמון", "tilapia", "anchovy", "סרדין"],
  "פירות ים": ["פירות ים", "seafood", "shrimp", "crab", "lobster", "octopus", "calamari", "scallops", "שרימפס", "קלמרי", "תמנון", "לובסטר"],
  "תירס": ["תירס", "corn", "corn flour", "corn starch", "cornmeal", "סירופ תירס", "corn syrup", "maize"],
  "שום": ["שום", "garlic", "garlic powder", "שום גבישי", "שום כתוש"],
  "בצל": ["בצל", "onion", "onion powder", "fried onion"],
  "חרדל": ["חרדל", "mustard", "mustard seeds", "דיז'ון"],
  "שמרים": ["שמרים", "yeast", "nutritional yeast", "brewer's yeast"],
  "שוקולד": ["שוקולד", "chocolate", "dark chocolate", "cocoa", "cacao", "אבקת קקאו"],
  "קפאין": ["קפאין", "caffeine", "קפה", "coffee", "tea", "energy drink", "espresso"],
  "ללא חלב": ["ללא חלב", "dairy-free", "non-dairy", "milk-free", "חופשי מחלב"],
  "ללא גלוטן": ["ללא גלוטן", "gluten-free", "free of gluten", "חופשי מגלוטן"],
  "ללא ביצים": ["ללא ביצים", "egg-free", "free of eggs", "חופשי מביצים"],
  "ללא בוטנים": ["ללא בוטנים", "peanut-free", "free of peanuts"],
  "ללא אגוזים": ["ללא אגוזים", "nut-free", "free of nuts"],
  "ללא סויה": ["ללא סויה", "soy-free", "free of soy"],
  "ללא שומשום": ["ללא שומשום", "sesame-free", "free of sesame"],
};

    const reverseMap = {};
    Object.entries(allergenSynonyms).forEach(([main, terms]) =>
      terms.forEach(t => reverseMap[t.toLowerCase()] = main)
    );

    const normalizedAllergies = userAllergies.map(a => reverseMap[a.toLowerCase()] || a);

    const allergyTerms = normalizedAllergies.flatMap(a =>
      allergenSynonyms[a] || [a]
    ).map(t => t.toLowerCase());

    // שלב 3: בדיקת התאמה
    const detectedAllergens = [...(ingredients || []).map(i => i.name), ...(rawAllergens || [])];

    const matchedAllergens = detectedAllergens.filter(ing =>
      typeof ing === 'string' &&
      allergyTerms.some(syn => ing.toLowerCase().includes(syn))
    );

    // שלב 4: שמירה להיסטוריה
    const { error: insertError } = await supabase
      .from('history')
      .insert([{
        user_id: user.id,
        image_url: imageUrl,
        total_calories: totalCalories,
        ingredients,
        allergens: matchedAllergens,
        created_at: new Date().toISOString()
      }]);

    if (insertError) {
      console.error('❌ שגיאה בהכנסה:', insertError.message);
      showMessage('⚠️ שגיאה בשמירת היסטוריה', 'error');
      return;
    }

    // שמירה ל-sessionStorage
    sessionStorage.setItem('ingredients', JSON.stringify(ingredients));
    sessionStorage.setItem('allergens', JSON.stringify(matchedAllergens));
    sessionStorage.setItem('totalCalories', totalCalories);
    sessionStorage.setItem('imageUrl', imageUrl);
    window.location.href = 'foodshazam-results.html';

  } catch (e) {
    console.error('🧨 שגיאה:', e);
    showMessage('⚠️ שגיאה כללית', 'error');
  } finally {
    hideLoading();
  }
}

  function showLoading() {
    loadingSection?.classList.remove('hidden');
  }

  function hideLoading() {
    loadingSection?.classList.add('hidden');
  }

  function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = type === 'error' ? 'error' : 'success';
    messageBox.classList.remove('hidden');
  }
});
