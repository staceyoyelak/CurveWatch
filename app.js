const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const startBtn = document.getElementById('start_btn');

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.poseLandmarks) {
        const leftShoulder = results.poseLandmarks[11];
        const rightShoulder = results.poseLandmarks[12];

        const dy = leftShoulder.y - rightShoulder.y;
        const dx = leftShoulder.x - rightShoulder.x;
        
        // Math.abs makes the number positive whether you tilt left or right
        let angle = Math.abs(Math.atan2(dy, dx) * (180 / Math.PI)); 
        
        const display = document.getElementById('angle_display');
        display.innerText = `Shoulder Tilt: ${angle.toFixed(1)}°`;

        // Color Logic: Changes color based on severity
        if (angle > 5.0) {
            display.className = 'warning';
            display.innerText += " - Consult a Specialist";
        } else {
            display.className = 'normal';
        }

        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2});
    }
    canvasCtx.restore();
}

// Set up the AI model
const pose = new Pose({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(onResults);

// The Button Code
startBtn.addEventListener('click', () => {
    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await pose.send({image: videoElement});
        },
        facingMode: 'environment', // Uses the back camera
        width: 480,                // Narrow
        height: 640                // Tall
    });
    camera.start();
    startBtn.innerText = "Scanning Active...";
});
const saveBtn = document.getElementById('save_btn');
const historyList = document.getElementById('history_list');
const clearBtn = document.getElementById('clear_btn');

// --- This part "Reads" the book when the app starts ---
function loadHistory() {
    const savedData = JSON.parse(localStorage.getItem('curveWatchHistory')) || [];
    savedData.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = item;
        historyList.appendChild(listItem); // Put them back on the screen
    });
}

// Run the loader immediately
loadHistory();

// --- This part "Writes" to the book when you click Save ---
saveBtn.addEventListener('click', () => {
    const currentTilt = document.getElementById('angle_display').innerText;
    const now = new Date();
    const timeString = now.toLocaleDateString() + " " + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    const entryHTML = `<strong>${timeString}:</strong> ${currentTilt}`;
    
    // 1. Show it on the screen right now
    const listItem = document.createElement('li');
    listItem.innerHTML = entryHTML;
    historyList.prepend(listItem);

    // 2. Lock it into the browser's permanent memory
    const savedData = JSON.parse(localStorage.getItem('curveWatchHistory')) || [];
    savedData.unshift(entryHTML); 
    localStorage.setItem('curveWatchHistory', JSON.stringify(savedData));
});