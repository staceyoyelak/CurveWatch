const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const angleDisplay = document.getElementById('angle_display');
const captureBtn = document.getElementById('capture_btn');
const saveBtn = document.getElementById('save_btn');

// 1. Initialize the Pose AI
const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
    modelComplexity: 0,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// 2. What happens when the AI finds a body
pose.onResults((results) => {
    // Match canvas size to the actual video stream size
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // Clear the canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw the captured image frame
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    // Draw the skeleton lines and dots
    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2});
        
        // Calculate the Shoulder Angle
        const leftS = results.poseLandmarks[11];  // Left Shoulder
        const rightS = results.poseLandmarks[12]; // Right Shoulder
        
        // Math to find the angle between two points
        const angle = Math.abs(Math.atan2(rightS.y - leftS.y, rightS.x - leftS.x) * 180 / Math.PI);
        
        // Update the text on the screen
        angleDisplay.innerText = `Shoulder Tilt: ${angle.toFixed(1)}°`;
        
        // Change text color if the tilt is high (Scientific insight!)
        angleDisplay.style.color = angle > 5 ? "red" : "#333";
    }
});

// 3. Start the Camera Stream
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: "environment",
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        });
        
        videoElement.srcObject = stream;
        
        // This is the "Magic" part that prevents the black screen/freeze
        videoElement.onloadedmetadata = () => {
            videoElement.play();
        };

    } catch (err) {
        console.error("Camera Error: ", err);
    }
}

// 4. Capture Button Logic
captureBtn.addEventListener('click', async () => {
    
    // --- MODE 1: RETAKING (If the button says "Retake Photo") ---
    if (captureBtn.innerText === "Retake Photo") {
        // 1. Clear the canvas markings
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        
        // 2. Unfreeze the camera
        videoElement.play();
        
        // 3. Reset the UI
        captureBtn.innerText = "Capture & Measure";
        saveBtn.style.display = 'none';
        angleDisplay.innerText = "Shoulder Tilt: 0°";
        angleDisplay.style.color = "#333";
    } 
    
    // --- MODE 2: CAPTURING (If the button says "Capture & Measure") ---
    else {
        captureBtn.innerText = "Analyzing...";
        
        try {
            // 1. Tell the AI to process the current frame
            await pose.send({image: videoElement});
            
            // 2. Freeze the camera so the user can see the result
            videoElement.pause();
            
            // 3. Update the button
            captureBtn.innerText = "Retake Photo";
            saveBtn.style.display = 'inline-block';
            
            // 4. Check if we need to show a scoliosis alert
            checkScoliosisAlert();
            
        } catch (error) {
            console.error("AI Analysis failed:", error);
            captureBtn.innerText = "Error - Try Again";
            videoElement.play(); // Make sure it doesn't stay frozen on an error
        }
    }
});

// 5. History Saving Logic
saveBtn.addEventListener('click', () => {
    const historyList = document.getElementById('history_list');
    const angleText = angleDisplay.innerText;
    const timeStamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Create the list item
    const li = document.createElement('li');
    li.style.padding = "10px";
    li.style.borderBottom = "1px solid #eee";
    li.innerHTML = `<strong>${timeStamp}</strong>: ${angleText}`;
    
    // Add to the top of the list
    historyList.prepend(li);
    
    // Save to LocalStorage (so it doesn't disappear on refresh)
    const existingHistory = JSON.parse(localStorage.getItem('scoliosis_history') || "[]");
    existingHistory.push({ time: timeStamp, angle: angleText });
    localStorage.setItem('scoliosis_history', JSON.stringify(existingHistory));

    // Hide save button so they don't double-save
    saveBtn.style.display = 'none';
    alert("Reading saved to history!");
});

// 6. Load History on Startup (Add this at the very bottom of app.js)
function loadSavedHistory() {
    const historyList = document.getElementById('history_list');
    const saved = JSON.parse(localStorage.getItem('scoliosis_history') || "[]");
    saved.reverse().forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${item.time}</strong>: ${item.angle}`;
        historyList.appendChild(li);
    });
}
loadSavedHistory();
// 6. Scoliosis Alert Function
function checkScoliosisAlert() {
    // We get the number from the text (e.g., "7.5" from "Shoulder Tilt: 7.5°")
    const currentAngle = parseFloat(angleDisplay.innerText.replace('Shoulder Tilt: ', ''));

    if (currentAngle > 7.0) {
        alert("⚠️ High Tilt Detected (" + currentAngle.toFixed(1) + "°)\n\nThis may indicate significant asymmetry. Please consult a specialist for a formal scoliosis screening.");
    } else if (currentAngle > 3.0) {
        alert("Notice: Mild asymmetry detected (" + currentAngle.toFixed(1) + "°). Keep monitoring for any changes.");
    }
}startCamera(); 