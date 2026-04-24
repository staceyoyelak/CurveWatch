const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const angleDisplay = document.getElementById('angle_display');

// Initialize Pose
const pose = new Pose({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`});
pose.setOptions({ modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });

// Draw the results onto the canvas
pose.onResults((results) => {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    if (results.poseLandmarks) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2});
        
        // Calculate the angle (Shoulders)
        const leftS = results.poseLandmarks[11];
        const rightS = results.poseLandmarks[12];
        const angle = Math.abs(Math.atan2(rightS.y - leftS.y, rightS.x - leftS.x) * 180 / Math.PI);
        angleDisplay.innerText = `Shoulder Tilt: ${angle.toFixed(1)}°`;
    }
});

// START THE CAMERA
async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Forces back camera
        audio: false
    });
    videoElement.srcObject = stream;
}

// CAPTURE BUTTON LOGIC
document.getElementById('capture_btn').addEventListener('click', async () => {
    // Send the current frame to the AI for a single measurement
    await pose.send({image: videoElement});
    document.getElementById('save_btn').style.display = 'inline-block';
});

startCamera();