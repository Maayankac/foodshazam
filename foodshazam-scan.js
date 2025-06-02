document.addEventListener('DOMContentLoaded', async () => {
    const supabase = window.supabase.createClient('https://kimdnostypcecnboxtyf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
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

    let stream, cameraActive = false, imageBlob = null, userAllergies = [];

    // קבלת משתמש מחובר
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        sessionStorage.setItem('userId', user.id);
        await fetchUserAllergies(user.id);
    }

    async function fetchUserAllergies(userId) {
        const { data, error } = await supabase.from('users').select('allergies').eq('id', userId).maybeSingle();
        userAllergies = (error || !data?.allergies) ? [] : data.allergies;
        sessionStorage.setItem('userAllergies', JSON.stringify(userAllergies));
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
                showMessage('לא ניתן להפעיל את המצלמה', 'error');
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
            processImageAndRedirect(blob);
        }, 'image/jpeg');
    });

    uploadBox?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            imageBlob = file;
            previewImage.src = URL.createObjectURL(file);
            previewElement.classList.remove('hidden');
            processImageAndRedirect(file);
        }
    });

    async function processImageAndRedirect(blob) {
        showLoading();
        const fileName = `food_${Date.now()}.jpg`;
        const { error } = await supabase.storage.from('images').upload(fileName, blob);
        if (error) return showMessage('שגיאה בהעלאת תמונה', 'error');

        const imageUrl = `${supabase.storageUrl}/storage/v1/object/public/images/${fileName}`;
        sessionStorage.setItem('imageUrl', imageUrl);

        const formData = new FormData();
        formData.append('image', blob);
        formData.append('user_id', sessionStorage.getItem('userId'));

        try {
            const response = await fetch('/analyze-image', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('שגיאה מהשרת');
            const { ingredients, allergens, totalCalories } = await response.json();

            sessionStorage.setItem('ingredients', JSON.stringify(ingredients));
            sessionStorage.setItem('allergens', JSON.stringify(allergens));
            sessionStorage.setItem('totalCalories', totalCalories);

            await saveScanToHistory({ imageUrl, ingredients, totalCalories, allergens });

            window.location.href = 'foodshazam-results.html';
        } catch (e) {
            showMessage('שגיאה כללית', 'error');
        } finally {
            hideLoading();
        }
    }

    async function saveScanToHistory({ imageUrl, ingredients, totalCalories, allergens }) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return console.warn('משתמש לא מחובר');
        await supabase.from('history').insert({ user_id: user.id, image_url: imageUrl, ingredients, total_calories: totalCalories, allergens });
    }

    function showLoading() { loadingSection?.classList.remove('hidden'); }
    function hideLoading() { loadingSection?.classList.add('hidden'); }
    function showMessage(text, type) {
        messageBox.textContent = text;
        messageBox.className = type === 'error' ? 'error' : 'success';
        messageBox.classList.remove('hidden');
    }
});
