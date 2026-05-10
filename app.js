// 1. SETUP - Get all the pieces from the HTML
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const angleDisplay = document.getElementById('angle_display');
const captureBtn = document.getElementById('capture_btn');
const saveBtn = document.getElementById('save_btn');
const levelIndicator = document.getElementById('level_indicator');
const sensorBtn = document.getElementById('sensor_btn');

// 2. THE SENSOR LOGIC (iPhone Fix)
sensorBtn.addEventListener('click', async () => {
    // Check if the device needs permission (iOS)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === 'granted') {
                startTracking();
                sensorBtn.style.display = 'none';
            }
        } catch (error) {
            alert("Please allow motion sensors in your iPhone settings.");
        }
    } else {
        // Android or Laptop (automatic)
        startTracking();
        sensorBtn.style.display = 'none';
    }
});

function startTracking() {
    window.addEventListener('deviceorientation', (event) => {
        const tiltFB = event.beta; // Forward/Back
        const tiltLR = event.gamma; // Left/Right

        // Range for BTYSTE quality: Vertical (75-105) and Level (-5 to 5)
        const isLevel = (tiltFB > 75 && tiltFB < 105) && (Math.abs(tiltLR) < 5);

        if (isLevel) {
            levelIndicator.innerText = "✓ Phone Level";
            levelIndicator.style.background = "rgba(40, 167, 69, 0.9)";
            captureBtn.disabled = false;
            captureBtn.style.opacity = "1";
        } else {
            levelIndicator.innerText = `⚠ Straighten Phone (${Math.round(tiltLR)}°)`;
            levelIndicator.style.background = "rgba(220, 53, 69, 0.9)";
            captureBtn.disabled = true;
            captureBtn.style.opacity = "0.5";
        }
        levelIndicator.style.display = "block";
    });
}

// 3. THE CAMERA LOGIC
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => videoElement.play();
    } catch (err) {
        console.error("Camera error:", err);
    }
}

// 4. THE AI LOGIC (MediaPipe)
const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

    if (results.poseLandmarks) {
        const leftShoulder = results.poseLandmarks[11];
        const rightShoulder = results.poseLandmarks[12];

        // Math for the angle
        const dy = leftShoulder.y - rightShoulder.y;
        const dx = leftShoulder.x - rightShoulder.x;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const tilt = Math.abs(angle).toFixed(1);

        angleDisplay.innerText = `Shoulder Tilt: ${tilt}°`;

        // Draw dots for the judge to see
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {color: '#00FF00', lineWidth: 4});
        drawLandmarks(canvasCtx, results.poseLandmarks, {color: '#FF0000', lineWidth: 2});
    }
    canvasCtx.restore();
});

// 5. CAPTURE & RETAKE LOGIC
captureBtn.addEventListener('click', async () => {
    if (captureBtn.innerText === "Retake Photo") {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        videoElement.play();
        captureBtn.innerText = "Capture & Measure";
    } else {
        await pose.send({image: videoElement});
        videoElement.pause();
        captureBtn.innerText = "Retake Photo";
    }
});

// START
startCamera();