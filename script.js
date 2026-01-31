// Global variables
let canvas, ctx;
let isDrawing = false;
let lastX = 0, lastY = 0;
let brushColor = '#E91E63';  // Black instead of green
let brushSize = 8;           // Thicker brush
let flowers = [];
let showGarden = false;
let model = null;

// Initialize when page loads
window.addEventListener('load', init);

async function loadModel() {
    try {
        model = await tf.loadLayersModel('model/model.json');
        console.log('✓ Model loaded successfully!');
    } catch (error) {
        console.error('Could not load model:', error);
    }
}


function init() {
    // Get canvas
    canvas = document.getElementById('drawing-canvas');
    ctx = canvas.getContext('2d');
    
    // Setup canvas
    ctx.fillStyle = '#FAF7F0';
    ctx.fillRect(0, 0, 400, 400);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    brushColor = '#000000';  // Change from '#6B8E6F' to pure black
    brushSize = 8;           // Change from 3 to 8

    // Drawing events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    
    // Touch events
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
    
    // Button events
    document.getElementById('toggle-view-btn').addEventListener('click', toggleView);
    document.getElementById('clear-btn').addEventListener('click', clearCanvas);
    document.getElementById('add-btn').addEventListener('click', addToGarden);
    
    // Color picker events
    document.getElementById('color-picker').addEventListener('input', (e) => {
        brushColor = e.target.value;
        updateColorDisplay();
    });
    
    document.getElementById('color-hex').addEventListener('input', (e) => {
        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
            brushColor = e.target.value;
            updateColorDisplay();
        }
    });
    
    // Brush size slider
    document.getElementById('brush-slider').addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
        document.getElementById('brush-size').textContent = brushSize + 'px';
    });
    
    // Initialize color display
    updateColorDisplay();
    
    // Load garden
    loadGarden();
    loadModel();

}

function updateColorDisplay() {
    document.getElementById('color-preview').style.background = brushColor;
    document.getElementById('color-picker').value = brushColor;
    document.getElementById('color-hex').value = brushColor;
}

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    
    // Get client coordinates regardless of touch or mouse
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    // Calculate the scale between the internal canvas size and the display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Return the actual canvas coordinates
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function startDrawing(e) {
    isDrawing = true;
    const coords = getCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;
}

function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    
    const coords = getCoordinates(e);
    
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    lastX = coords.x;
    lastY = coords.y;
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function clearCanvas() {
    ctx.fillStyle = '#FAF7F0';
    ctx.fillRect(0, 0, 400, 400);
}

function toggleView() {
    showGarden = !showGarden;
    
    if (showGarden) {
        document.getElementById('drawing-page').classList.add('hidden');
        document.getElementById('garden-page').classList.remove('hidden');
        document.getElementById('toggle-text').textContent = 'DRAW FLOWER';
        document.getElementById('toggle-icon').textContent = '🌸';
    } else {
        document.getElementById('drawing-page').classList.remove('hidden');
        document.getElementById('garden-page').classList.add('hidden');
        document.getElementById('toggle-text').textContent = 'GO TO GARDEN';
        document.getElementById('toggle-icon').textContent = '✨';
    }
}

// Preprocess canvas
function preprocessCanvas() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 28;
    tempCanvas.height = 28;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw resized image (keeps the colors)
    tempCtx.drawImage(canvas, 0, 0, 28, 28);
    const imageData = tempCtx.getImageData(0, 0, 28, 28);
    const pixels = [];
    
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        
        // Convert to grayscale for AI (standard luminance formula)
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Invert and normalize
        const normalized = (255 - gray) / 255;
        pixels.push(normalized);
    }
    
    return pixels;
}

async function addToGarden() {
    const btn = document.getElementById('add-btn');
    const btnText = document.getElementById('add-btn-text');
    
    btn.disabled = true;
    btnText.innerHTML = '<span class="spinning">🌸</span> Analyzing...';
    
    const pixels = preprocessCanvas();
    visualizePreprocessed();
    let isFlower = false;
    let confidence = 0;
    
    if (model) {
        // Use REAL model
        const tensor = tf.tensor(pixels).reshape([1, 28, 28, 1]);
        const prediction = await model.predict(tensor).data();
        tensor.dispose();
        
        confidence = prediction[0];
        isFlower = confidence > 0.5;
        
        console.log(`Prediction: ${confidence * 100}% flower`);
    } else {
        // Fallback if model not loaded
        const avgPixelValue = pixels.reduce((a, b) => a + b, 0) / pixels.length;
        isFlower = avgPixelValue > 0.1;
    }
    
    if (isFlower) {
        const imageData = canvas.toDataURL();
        const newFlower = {
            id: Date.now(),
            imageData,
            color: brushColor,
            timestamp: new Date().toISOString()
        };
        
        // Save to localStorage for local testing
        let localFlowers = JSON.parse(localStorage.getItem('flowers') || '[]');
        localFlowers.push(newFlower);
        localStorage.setItem('flowers', JSON.stringify(localFlowers));
        flowers = localFlowers;
        
        setTimeout(() => {
            btn.disabled = false;
            btnText.textContent = '🌸 ADD TO GARDEN';
            clearCanvas();
            toggleView();
            renderGarden();
        }, 800);
    } else {
        btn.disabled = false;
        btnText.textContent = '🌸 ADD TO GARDEN';
        alert(`Hmm, that doesn't look like a flower! 🌸\nConfidence: ${(confidence * 100).toFixed(1)}%`);
    }
}


async function loadGarden() {
    try {
        const result = await window.storage.list('flower:', true);
        if (result && result.keys) {
            const flowerData = await Promise.all(
                result.keys.map(async (key) => {
                    try {
                        const data = await window.storage.get(key, true);
                        return data ? JSON.parse(data.value) : null;
                    } catch {
                        return null;
                    }
                })
            );
            flowers = flowerData.filter(f => f !== null);
            renderGarden();
        }
    } catch (error) {
        console.log('Garden is empty!');
    }
}

function renderGarden() {
    const grid = document.getElementById('garden-grid');
    const count = document.getElementById('flower-count');
    
    count.textContent = `${flowers.length} flowers planted by people around the world 🌍`;
    
    if (flowers.length === 0) {
        grid.innerHTML = `
            <div style="
                background: linear-gradient(to bottom, #87CEEB 0%, #87CEEB 40%, #90C090 40%, #7DB87D 100%);
                min-height: 600px;
                border-radius: 1.5rem;
                position: relative;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            ">
                <!-- Clouds -->
                <div style="position: absolute; top: 50px; left: 80px; width: 120px; height: 60px; background: rgba(255,255,255,0.6); border-radius: 50%; filter: blur(8px);"></div>
                <div style="position: absolute; top: 80px; right: 100px; width: 150px; height: 70px; background: rgba(255,255,255,0.5); border-radius: 50%; filter: blur(8px);"></div>
                
                <!-- Message -->
                <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(255,255,255,0.9);
                    backdrop-filter: blur(10px);
                    padding: 3rem;
                    border-radius: 1rem;
                    text-align: center;
                ">
                    <p style="font-size: 2rem; color: #8B7355; margin-bottom: 1rem;">The garden is empty! 🌱</p>
                    <p style="font-size: 1.2rem; color: #A0A096;">Draw the first flower to start our community garden!</p>
                </div>
            </div>
        `;
    } else {
        // Create garden container
        let gardenHTML = `
            <div style="
                background: linear-gradient(to bottom, #87CEEB 0%, #87CEEB 30%, #90C090 30%, #7DB87D 100%);
                min-height: 700px;
                border-radius: 1.5rem;
                position: relative;
                overflow: hidden;
                padding: 3rem;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            ">
                <!-- Sky decorations -->
                <div style="position: absolute; top: 40px; left: 60px; width: 100px; height: 50px; background: rgba(255,255,255,0.6); border-radius: 50%; filter: blur(6px);"></div>
                <div style="position: absolute; top: 60px; right: 80px; width: 130px; height: 60px; background: rgba(255,255,255,0.5); border-radius: 50%; filter: blur(6px);"></div>
                <div style="position: absolute; top: 100px; left: 40%; width: 90px; height: 45px; background: rgba(255,255,255,0.4); border-radius: 50%; filter: blur(6px);"></div>
                
                <!-- Grass texture -->
                <div style="
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 70%;
                    background: repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.02) 2px, rgba(0,0,0,0.02) 4px);
                    pointer-events: none;
                "></div>
                
                <!-- Flowers container -->
                <div style="position: relative; margin-top: 30%; min-height: 400px;">
        `;
        
        // Add each flower
        flowers.forEach((flower, index) => {
            // Natural positioning algorithm
            const row = Math.floor(index / 6);
            const col = index % 6;
            const randomOffsetX = Math.sin(flower.id) * 30;
            const randomOffsetY = Math.cos(flower.id) * 20;
            const randomRotation = Math.sin(flower.id * 2) * 15;
            const randomScale = 0.8 + Math.sin(flower.id * 3) * 0.3;
            
            gardenHTML += `
                <div style="
                    position: absolute;
                    left: ${col * 16 + randomOffsetX}%;
                    top: ${row * 25 + randomOffsetY}%;
                    transform: rotate(${randomRotation}deg) scale(${randomScale});
                    width: 120px;
                    transition: transform 0.3s;
                " onmouseover="this.style.transform='rotate(${randomRotation}deg) scale(${randomScale * 1.3})'" 
                   onmouseout="this.style.transform='rotate(${randomRotation}deg) scale(${randomScale})'">
                    <!-- Stem -->
                    <div style="
                        position: absolute;
                        bottom: 0;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 3px;
                        height: 40px;
                        background: #2d5016;
                        z-index: 0;
                    "></div>
                    
                    <!-- Flower head -->
                    <div style="
                        position: relative;
                        width: 100px;
                        height: 100px;
                        background: white;
                        border: 3px solid rgba(255,255,255,0.8);
                        border-radius: 1rem;
                        overflow: hidden;
                        box-shadow: 0 8px 20px rgba(0,0,0,0.2);
                        z-index: 1;
                    ">
                        <img src="${flower.imageData}" alt="Flower" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    
                    <!-- Date tooltip -->
                    <div style="
                        position: absolute;
                        top: -40px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: white;
                        padding: 0.5rem 0.75rem;
                        border-radius: 0.5rem;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        font-size: 0.75rem;
                        color: #6B7280;
                        white-space: nowrap;
                        opacity: 0;
                        pointer-events: none;
                        transition: opacity 0.3s;
                    " class="flower-tooltip-${index}">
                        ${new Date(flower.timestamp).toLocaleDateString()}
                    </div>
                </div>
            `;
        });
        
        gardenHTML += `
                </div>
            </div>
        `;
        
        grid.innerHTML = gardenHTML;
    }
}

// Add this function temporarily for debugging
function visualizePreprocessed() {
    const pixels = preprocessCanvas();
    
    // Create a debug canvas to see what the model sees
    const debugCanvas = document.createElement('canvas');
    debugCanvas.width = 28;
    debugCanvas.height = 28;
    debugCanvas.style.position = 'fixed';
    debugCanvas.style.top = '10px';
    debugCanvas.style.right = '10px';
    debugCanvas.style.border = '2px solid red';
    debugCanvas.style.zIndex = '9999';
    document.body.appendChild(debugCanvas);
    
    const debugCtx = debugCanvas.getContext('2d');
    const debugImageData = debugCtx.createImageData(28, 28);
    
    for (let i = 0; i < pixels.length; i++) {
        const val = pixels[i] * 255;
        debugImageData.data[i * 4] = val;     // R
        debugImageData.data[i * 4 + 1] = val; // G
        debugImageData.data[i * 4 + 2] = val; // B
        debugImageData.data[i * 4 + 3] = 255; // A
    }
    
    debugCtx.putImageData(debugImageData, 0, 0);
    
    console.log('First 10 pixel values:', pixels.slice(0, 10));
    console.log('Average pixel value:', pixels.reduce((a,b) => a+b) / pixels.length);
}