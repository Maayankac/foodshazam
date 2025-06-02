const supabaseUrl = 'https://kimdnostypcecnboxtyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbWRub3N0eXBjZWNuYm94dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjMwODQsImV4cCI6MjA2MTM5OTA4NH0.CwJTYsEcmSPmvqTm9Jvt3sRzPcGuO9rZbCp2viZVyP4'; // Supabase anon key בלבד
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);



// DOM Elements
const cameraToggle = document.getElementById('camera-toggle');
const camera = document.getElementById('camera');
const cameraStatus = document.getElementById('camera-status');
const captureButton = document.getElementById('capture-button');
const fileInput = document.getElementById('file-input');
const uploadBox = document.getElementById('upload-box');
const previewElement = document.getElementById('preview');
const previewImage = document.getElementById('preview-image');
const loadingSection = document.getElementById('loading-section');
const messageBox = document.getElementById('messageBox');
const canvas = document.getElementById('capture-canvas');
const uploadSection = document.getElementById('upload-section');
const retryOptions = document.getElementById('retry-options');
const retryCamera = document.getElementById('retry-camera');
const retryUpload = document.getElementById('retry-upload');
const allergiesSection = document.getElementById('allergies-section');
const allergiesList = document.getElementById('allergies-list');
const addAllergyButton = document.getElementById('add-allergy');
const allergyInput = document.getElementById('allergy-input');

let stream;
let cameraActive = false;
let imageBlob = null;
let userAllergies = [];
(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user) {
      sessionStorage.setItem('userId', user.id);
      console.log('userId שמור:', user.id);
    } else {
      console.warn('אין משתמש מחובר כרגע');
    }
  })();
  

// Load saved allergies if they exist
initializeAllergies();

function initializeAllergies() {
    const savedAllergies = localStorage.getItem('userAllergies');
    if (savedAllergies) {
        userAllergies = JSON.parse(savedAllergies);
        renderAllergiesList();
    }
}

function saveAllergies() {
    localStorage.setItem('userAllergies', JSON.stringify(userAllergies));
}

function renderAllergiesList() {
    allergiesList.innerHTML = '';
    userAllergies.forEach((allergy, index) => {
        const allergyItem = document.createElement('div');
        allergyItem.className = 'allergy-item';

        const allergyText = document.createElement('span');
        allergyText.textContent = allergy;
        allergyItem.appendChild(allergyText);

        const removeButton = document.createElement('button');
        removeButton.textContent = 'הסר';
        removeButton.className = 'remove-allergy';
        removeButton.addEventListener('click', () => {
            userAllergies.splice(index, 1);
            saveAllergies();
            renderAllergiesList();
        });

        allergyItem.appendChild(removeButton);
        allergiesList.appendChild(allergyItem);
    });
}

// Add new allergy
if (addAllergyButton && allergyInput) {
    addAllergyButton.addEventListener('click', () => {
        const allergy = allergyInput.value.trim();
        if (allergy && !userAllergies.includes(allergy)) {
            userAllergies.push(allergy);
            saveAllergies();
            renderAllergiesList();
            allergyInput.value = '';
        }
    });

    allergyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addAllergyButton.click();
        }
    });
}

// Toggle camera
cameraToggle.addEventListener('click', async () => {
    if (!cameraActive) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            camera.srcObject = stream;
            camera.style.display = 'block';
            cameraActive = true;
            cameraStatus.textContent = 'מצלמה פעילה';
            cameraStatus.className = 'status-active';
            cameraToggle.textContent = 'כבה מצלמה';
            captureButton.classList.remove('hidden');
            uploadSection.classList.add('hidden');
        } catch (err) {
            showMessage('לא ניתן להפעיל את המצלמה. בדוק הרשאות או נסה להעלות תמונה.', 'error');
            console.error('Camera error:', err);
        }
    } else {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        camera.srcObject = null;
        camera.style.display = 'none';
        cameraActive = false;
        cameraStatus.textContent = 'מצלמה כבויה';
        cameraStatus.className = 'status-inactive';
        cameraToggle.textContent = 'הפעל מצלמה';
        captureButton.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    }
});

captureButton.addEventListener('click', () => {
    if (!cameraActive) return;
    const context = canvas.getContext('2d');
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;
    context.drawImage(camera, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
        imageBlob = blob;
        previewImage.src = URL.createObjectURL(blob);
        previewElement.classList.remove('hidden');
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        camera.style.display = 'none';
        cameraActive = false;
        cameraStatus.textContent = 'מצלמה כבויה';
        cameraStatus.className = 'status-inactive';
        cameraToggle.textContent = 'הפעל מצלמה';
        captureButton.classList.add('hidden');
        processImageAndRedirect(blob);
    }, 'image/jpeg');
});

uploadBox.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    imageBlob = file;
    previewImage.src = URL.createObjectURL(file);
    previewElement.classList.remove('hidden');
    processImageAndRedirect(file);
});

async function fetchUserAllergies(userId) {
    if (!userId) {
        console.error('❌ userId is missing');
        sessionStorage.setItem('userAllergies', JSON.stringify([]));
        userAllergies = [];
        return;
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('allergies')
            .eq('id', userId)
            .maybeSingle();

        if (error || !data || !Array.isArray(data.allergies)) {
            console.warn('⚠️ לא נמצאו אלרגיות למשתמש או שגיאה:', error || data);
            sessionStorage.setItem('userAllergies', JSON.stringify([]));
            userAllergies = [];
            return;
        }

        sessionStorage.setItem('userAllergies', JSON.stringify(data.allergies));
        userAllergies = data.allergies;

    } catch (e) {
        console.error('❌ שגיאה כללית בפונקציית fetchUserAllergies:', e);
        sessionStorage.setItem('userAllergies', JSON.stringify([]));
        userAllergies = [];
    }
}


// =============================================================

async function processImageAndRedirect(blob) {
    showLoading();
    showMessage('מזהה את המנה...', 'info');

    try {
        const fileName = `food_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('images')
            .upload(fileName, blob);

        if (uploadError) {
            showMessage('שגיאה בהעלאת תמונה לשרת', 'error');
            console.error(uploadError);
            return;
        }

        const imageUrl = `${supabaseUrl}/storage/v1/object/public/images/${fileName}`;
        sessionStorage.setItem('imageUrl', imageUrl);

        // ⬇️ שליחה לשרת במקום ל-OpenAI ישירות
        const formData = new FormData();
        formData.append('image', blob);
        formData.append('user_id', sessionStorage.getItem('userId')); // במידת הצורך

        const response = await fetch('/analyze-image', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('שגיאה מהשרת');
        const result = await response.json();

        console.log("📢 תוצאה מהשרת:", result);

        // שמירה ב-sessionStorage כדי להמשיך כמו קודם
        sessionStorage.setItem('ingredients', JSON.stringify(result.ingredients));
        sessionStorage.setItem('allergens', JSON.stringify(result.allergens));
        sessionStorage.setItem('foodName', 'מנה לא מזוהה'); // או כל שם שתבחר
        // אם יש totalCalories - תחשב ותשמור גם

        checkForAllergens();

        // שמירה להיסטוריה פר משתמש
        const totalCalories = 0; // כאן אפשר לחשב לפי רכיבים אם תוסיף
        await saveScanToHistory({
            imageUrl,
            ingredients: result.ingredients,
            totalCalories,
            allergens: result.allergens
        });

        // מעבר לעמוד התוצאות
        setTimeout(() => {
            hideLoading();
            showMessage('המנה זוהתה! עובר לעמוד התוצאות...', 'success');
            window.location.href = 'foodshazam-results.html';
        }, 1000);

    } catch (error) {
        console.error('שגיאה כללית:', error);
        showMessage('שגיאה לא צפויה. אנא נסה שוב.', 'error');
        hideLoading();
    }
}


function checkForAllergens() {
    try {
        const ingredients = JSON.parse(sessionStorage.getItem('ingredients') || '[]');
        const allergens = [];

        ingredients.forEach(ingredient => {
            userAllergies.forEach(allergy => {
                if (ingredient.name.toLowerCase().includes(allergy.toLowerCase())) {
                    if (!allergens.includes(allergy)) {
                        allergens.push(allergy);
                    }
                }
            });
        });

        sessionStorage.setItem('allergens', JSON.stringify(allergens));
    } catch (error) {
        console.error('שגיאה בבדיקת אלרגנים:', error);
        sessionStorage.setItem('allergens', JSON.stringify([]));
    }
}

function showLoading() {
    loadingSection.classList.remove('hidden');
}

function hideLoading() {
    loadingSection.classList.add('hidden');
}

function showMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = type === 'error' ? 'error' : 'success';
    messageBox.classList.remove('hidden');
    console.log(`Message (${type}): ${text}`);
}

retryCamera.addEventListener('click', () => {
    messageBox.classList.add('hidden');
    previewElement.classList.add('hidden');
    if (!cameraActive) cameraToggle.click();
});

retryUpload.addEventListener('click', () => {
    messageBox.classList.add('hidden');
    previewElement.classList.add('hidden');
    if (cameraActive) cameraToggle.click();
    fileInput.click();
});

uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = '#4caf50';
    uploadBox.style.backgroundColor = '#f1f8e9';
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.style.borderColor = '#ccc';
    uploadBox.style.backgroundColor = '';
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = '#ccc';
    uploadBox.style.backgroundColor = '';
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
        showMessage('אנא בחר קובץ תמונה תקין', 'error');
        return;
    }
    imageBlob = file;
    previewImage.src = URL.createObjectURL(file);
    previewElement.classList.remove('hidden');
    processImageAndRedirect(file);
});async function saveScanToHistory({ imageUrl, ingredients, totalCalories, allergens }) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
  
    if (userError || !user) {
      console.warn('משתמש לא מחובר, לא שומר היסטוריה');
      return;
    }
  
    const { error } = await supabase.from('history').insert({
      user_id: user.id,
      image_url: imageUrl,
      ingredients,
      total_calories: totalCalories,
      allergens
    });
  
    if (error) {
      console.error('שגיאה בשמירת ההיסטוריה:', error.message);
    } else {
      console.log('✅ סריקה נשמרה בהצלחה להיסטוריה');
    }
  }
  
