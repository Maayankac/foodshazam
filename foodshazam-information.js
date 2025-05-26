// חיבור ל-Supabase
const supabaseUrl = 'https://kimdnostypcecnboxtyf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpbWRub3N0eXBjZWNuYm94dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4MjMwODQsImV4cCI6MjA2MTM5OTA4NH0.CwJTYsEcmSPmvqTm9Jvt3sRzPcGuO9rZbCp2viZVyP4';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', () => {
    // אלמנטים בדף
    const uploadBox = document.getElementById('upload-box');
    const fileInput = document.getElementById('file-input');
    const captureButton = document.getElementById('capture-button');
    const previewSection = document.getElementById('preview-section');
    const uploadSection = document.getElementById('upload-section');
    const previewImage = document.getElementById('preview-image');
    const retakeButton = document.getElementById('retake-button');
    const analyzeButton = document.getElementById('analyze-button');
    const loadingSection = document.getElementById('loading-section');
    const resultsSection = document.getElementById('results-section');
    const saveMealButton = document.getElementById('save-meal-button');

    // אלמנטים של תוצאות
    const foodName = document.getElementById('food-name');
    const caloriesValue = document.getElementById('calories-value');
    const proteinValue = document.getElementById('protein-value');
    const carbsValue = document.getElementById('carbs-value');
    const fatValue = document.getElementById('fat-value');
    const ingredientsList = document.getElementById('ingredients-list');
    const allergiesWarning = document.getElementById('allergies-warning');
    const allergiesDetectedList = document.getElementById('allergies-detected-list');

    let selectedImage = null;
    let userAllergies = [];
    let currentMealData = null;

    // בדיקה אם המשתמש מחובר
    checkUserSession();

    // יצירת אירוע גרירה
    setupDragAndDrop();

    // בחירת קובץ
    fileInput.addEventListener('change', handleFileSelection);

    // כפתור מצלמה
    captureButton.addEventListener('click', () => {
        fileInput.click();
    });

    // כפתור צילום חדש
    retakeButton.addEventListener('click', () => {
        resetToUploadState();
    });

    // כפתור אנליזה
    analyzeButton.addEventListener('click', () => {
        if (selectedImage) {
            startAnalysis();
        } else {
            showMessage('אנא בחר תמונה קודם', 'error');
        }
    });

    // כפתור שמירת ארוחה
    saveMealButton.addEventListener('click', () => {
        if (currentMealData) {
            saveMealToHistory();
        }
    });

    // פונקציית בדיקת חיבור משתמש
    async function checkUserSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('שגיאה בטעינת המשתמש:', error.message);
                // בשלב הפיתוח - נמשיך בלי הפניה להתחברות
                console.log('המשך ללא התחברות (מצב פיתוח)');
                return;
            }
            
            if (!session) {
                console.log('משתמש לא מחובר');
                // בשלב הפיתוח - נמשיך בלי הפניה להתחברות
                console.log('המשך ללא התחברות (מצב פיתוח)');
                return;
            }
            
            console.log('משתמש מחובר:', session.user.email);
            // טעינת אלרגיות המשתמש
            await loadUserAllergies(session.user.id);
            
        } catch (err) {
            console.error('שגיאה בבדיקת הסשן:', err);
            console.log('המשך ללא התחברות (מצב פיתוח)');
        }
    }

    // פונקציית העברה לדף התחברות
    function redirectToLogin() {
        showMessage('יש להתחבר כדי להשתמש בסורק', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }

    // פונקציה לטעינת האלרגיות של המשתמש
    async function loadUserAllergies(userId) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('allergies')
                .eq('id', userId)
                .single();
                
            if (error) {
                console.error('שגיאה בטעינת אלרגיות:', error.message);
                return;
            }
            
            if (data && data.allergies) {
                userAllergies = data.allergies;
                console.log('אלרגיות שנטענו:', userAllergies);
            }
        } catch (err) {
            console.error('שגיאה בטעינת אלרגיות:', err);
        }
    }

    // הגדרות גרירה והשלכה
    function setupDragAndDrop() {
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.classList.add('dragging');
        });

        uploadBox.addEventListener('dragleave', () => {
            uploadBox.classList.remove('dragging');
        });

        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.classList.remove('dragging');
            
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelection({ target: fileInput });
            }
        });
    }

    // טיפול בבחירת קובץ
    function handleFileSelection(e) {
        const file = e.target.files[0];
        
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                selectedImage = event.target.result;
                previewImage.src = selectedImage;
                showPreviewSection();
            };
            
            reader.readAsDataURL(file);
        } else if (file) {
            showMessage('אנא בחר קובץ תמונה', 'error');
        }
    }

    // הצגת אזור תצוגה מקדימה
    function showPreviewSection() {
        uploadSection.classList.add('hidden');
        previewSection.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        loadingSection.classList.add('hidden');
    }

    // איפוס למצב העלאה
    function resetToUploadState() {
        selectedImage = null;
        fileInput.value = '';
        uploadSection.classList.remove('hidden');
        previewSection.classList.add('hidden');
        resultsSection.classList.add('hidden');
        loadingSection.classList.add('hidden');
    }

    // התחלת אנליזה של התמונה
    function startAnalysis() {
        previewSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
        
        // כאן נדמה פעולת אנליזה (במקום API אמיתי)
        simulateImageAnalysis();
    }

    // פונקציה להדמיית תהליך האנליזה (דוגמה)
    function simulateImageAnalysis() {
        // זמן הדמיה לתהליך הניתוח
        setTimeout(() => {
            // דוגמה לתוצאות שחוזרות מה-API
            const mockResults = {
                name: "סלט קינואה ירקות",
                nutritionFacts: {
                    calories: 320,
                    protein: 12,
                    carbs: 45,
                    fat: 8
                },
                ingredients: [
                    "קינואה", 
                    "עגבניות שרי", 
                    "מלפפונים", 
                    "בצל סגול", 
                    "פטרוזיליה", 
                    "נענע", 
                    "שמן זית", 
                    "מיץ לימון", 
                    "מלח", 
                    "פלפל שחור",
                    "אגוזי מלך"
                ]
            };
            
            // שמירת הנתונים הנוכחיים
            currentMealData = mockResults;
            
            // הצגת התוצאות
            displayResults(mockResults);
            
            // הסתרת מסך הטעינה והצגת התוצאות
            loadingSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            
        }, 2000); // זמן סימולציה של שתי שניות
    }

    // הצגת התוצאות בממשק
    function displayResults(results) {
        // הצגת שם המנה
        foodName.textContent = results.name;
        
        // הצגת ערכים תזונתיים
        caloriesValue.textContent = results.nutritionFacts.calories;
        proteinValue.textContent = results.nutritionFacts.protein;
        carbsValue.textContent = results.nutritionFacts.carbs;
        fatValue.textContent = results.nutritionFacts.fat;
        
        // הצגת מרכיבים
        ingredientsList.innerHTML = '';
        results.ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient;
            ingredientsList.appendChild(li);
        });
        
        // בדיקת אלרגיות
        checkForAllergies(results.ingredients);
    }

    // בדיקת אלרגיות במנה
    function checkForAllergies(ingredients) {
        // אלרגיות לדוגמה אם לא נטענו אלרגיות מהמשתמש
        const sampleAllergies = userAllergies.length > 0 ? userAllergies : ['אגוזים', 'גלוטן', 'לקטוז'];
        
        // המרת הכל לאותיות קטנות להשוואה קלה יותר
        const normalizedAllergies = sampleAllergies.map(a => a.toLowerCase());
        const normalizedIngredients = ingredients.map(i => i.toLowerCase());
        
        // מציאת התאמות
        const detectedAllergies = [];
        
        normalizedAllergies.forEach(allergy => {
            // בדיקה אם יש רכיב שמכיל את האלרגיה
            const found = normalizedIngredients.some(ingredient => 
                ingredient.includes(allergy) || 
                // בדיקות ספציפיות לסוגי אלרגיות
                (allergy === 'אגוזים' && 
                    (ingredient.includes('אגוז') || 
                     ingredient.includes('שקד') || 
                     ingredient.includes('קשיו') || 
                     ingredient.includes('פקאן'))) ||
                (allergy === 'גלוטן' && 
                    (ingredient.includes('חיטה') || 
                     ingredient.includes('שעורה') || 
                     ingredient.includes('לחם') ||
                     ingredient.includes('קמח'))) ||
                (allergy === 'לקטוז' && 
                    (ingredient.includes('חלב') || 
                     ingredient.includes('גבינה') || 
                     ingredient.includes('חמאה')))
            );
            
            if (found) {
                // מחזירים את האלרגיה במקרה שהיא אמתית ממשתמש
                const originalAllergy = sampleAllergies[normalizedAllergies.indexOf(allergy)];
                detectedAllergies.push(originalAllergy);
            }
        });
        
        // הצגת אזהרות אלרגיה אם נמצאו
        if (detectedAllergies.length > 0) {
            allergiesWarning.classList.remove('hidden');
            allergiesDetectedList.innerHTML = '';
            
            detectedAllergies.forEach(allergy => {
                const li = document.createElement('li');
                li.textContent = allergy;
                allergiesDetectedList.appendChild(li);
            });
        } else {
            allergiesWarning.classList.add('hidden');
        }
    }

    // שמירת הארוחה להיסטוריה
    async function saveMealToHistory() {
        if (!currentMealData) return;
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showMessage('יש להתחבר כדי לשמור ארוחות', 'error');
                return;
            }
            
            const userId = session.user.id;
            const timestamp = new Date().toISOString();
            
            const meal = {
                user_id: userId,
                meal_name: currentMealData.name,
                calories: currentMealData.nutritionFacts.calories,
                protein: currentMealData.nutritionFacts.protein,
                carbs: currentMealData.nutritionFacts.carbs,
                fat: currentMealData.nutritionFacts.fat,
                ingredients: currentMealData.ingredients,
                timestamp: timestamp
            };
            
            const { error } = await supabase
                .from('meal_history')
                .insert([meal]);
                
            if (error) {
                console.error('שגיאה בשמירת הארוחה:', error);
                showMessage('שגיאה בשמירת הארוחה', 'error');
                return;
            }
            
            showMessage('הארוחה נשמרה בהצלחה!', 'success');
            
        } catch (err) {
            console.error('שגיאה בשמירת הארוחה:', err);
            showMessage('שגיאה בשמירת הארוחה', 'error');
        }
    }

    // פונקציה להצגת הודעות מעוצבות
    function showMessage(message, type = 'success') {
        const messageBox = document.getElementById('messageBox');
        messageBox.textContent = message;
        messageBox.className = type === 'error' ? 'error' : '';
        messageBox.classList.remove('hidden');
        
        // אנימציה להצגת ההודעה
        messageBox.style.transform = "translateY(-10px)";
        messageBox.style.opacity = "0";
        
        setTimeout(() => {
            messageBox.style.transition = "all 0.3s ease";
            messageBox.style.transform = "translateY(0)";
            messageBox.style.opacity = "1";
        }, 10);

        setTimeout(() => {
            messageBox.style.transform = "translateY(-10px)";
            messageBox.style.opacity = "0";
            
            setTimeout(() => {
                messageBox.classList.add('hidden');
                messageBox.style.transform = "";
                messageBox.style.opacity = "";
            }, 300);
        }, 4000);
    }
});