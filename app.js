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
    modelComplexity: 1,
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
                facingMode: "environment", // Uses back camera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        videoElement.srcObject = stream;
    } catch (err) {
        console.error("Error accessing camera: ", err);
        alert("Please allow camera access to use CurveWatch.");
    }
}

// 4. Capture Button Logic
captureBtn.addEventListener('click', async () => {
    if (captureBtn.innerText === "Retake Photo") {
        // Reset the screen
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        captureBtn.innerText = "Capture & Measure";
        saveBtn.style.display = 'none';
        angleDisplay.innerText = "Shoulder Tilt: 0°";
        angleDisplay.style.color = "#333";
    } else {
        // Change text so the user knows the AI is "thinking"
        captureBtn.innerText = "Analyzing...";
        
        // Use 'await' to make sure the AI finishes pose.send before moving on
        try {
            await pose.send({image: videoElement});
            
            // Give the AI a tiny heartbeat (100ms) to finish drawing results
            setTimeout(() => {
                captureBtn.innerText = "Retake Photo";
                saveBtn.style.display = 'inline-block';
                checkScoliosisAlert();
            }, 100);
            
        } catch (error) {
            console.error("AI Analysis failed:", error);
            captureBtn.innerText = "Error - Try Again";
        }
    }
});

// 5. History Saving Logic
saveBtn.addEventListener('click', () => {
    const historyList = document.getElementById('history_list');
    const li = document.createElement('li');
    li.innerText = `${new Date().toLocaleTimeString()}: ${angleDisplay.innerText}`;
    historyList.appendChild(li);
    saveBtn.style.display = 'none';
});

// Start the app
startCamera();
// 6. Scoliosis Alert Function
function checkScoliosisAlert() {
    // We get the number from the text (e.g., "7.5" from "Shoulder Tilt: 7.5°")
    const currentAngle = parseFloat(angleDisplay.innerText.replace('Shoulder Tilt: ', ''));

    if (currentAngle > 7.0) {
        alert("⚠️ High Tilt Detected (" + currentAngle.toFixed(1) + "°)\n\nThis may indicate significant asymmetry. Please consult a specialist for a formal scoliosis screening.");
    } else if (currentAngle > 3.0) {
        alert("Notice: Mild asymmetry detected (" + currentAngle.toFixed(1) + "°). Keep monitoring for any changes.");
    }
}