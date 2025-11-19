/* === ROLLER COASTER SIMULATOR (V3: VECTOR DISPLAY) ===
   - Deeper, steeper track for more "thrill"
   - Real-time G-force and Speed (km/h) display
   - ADDED: Tangent (Velocity) and Normal (G-Force) vectors
*/

// --- 1. Global Variables & Constants ---
let g = 9.81; // Acceleration due to gravity (m/s^2)
const trackStartHeight = 20.0; // The track's actual start height
let initialSpeed = 0.5;
let energyStartHeight = trackStartHeight + (initialSpeed * initialSpeed) / (2 * g);

let cartX = 0.0; // Cart's current X position (in meters, 0 to 25)
let cartY = 0.0; // Cart's current Y position (in meters)
let running = true; // Whether the animation is running
let timeScale = 1.0; // Speed multiplier for the animation

function updateEnergyStartHeight() {
  energyStartHeight = trackStartHeight + (initialSpeed * initialSpeed) / (2 * g);
}

// --- 2. The Track Functions (NEW, Steeper) ---

// f(x): Returns the height (y) of the track at a given x
function f(x) {
  if (x >= 0 && x < 5) {
    // f1(x) = 20 - 0.32*x^2
    return 20.0 - 0.32 * Math.pow(x, 2);
  } else if (x >= 5 && x < 15) {
    // f2(x) = 0.0064*(x - 10)^4 + 8.0
    return 0.0064 * Math.pow(x - 10, 4) + 8.0;
  } else if (x >= 15 && x <= 25) {
    // f3(x) = 20.0 - 0.32*(x - 20)^2
    return 20.0 - 0.32 * Math.pow(x - 20, 2);
  } else {
    // Default case (if x goes out of bounds)
    return trackStartHeight;
  }
}

// f'(x): Returns the slope of the track at a given x
function fPrime(x) {
  if (x >= 0 && x < 5) {
    // f1'(x) = -0.64*x
    return -0.64 * x;
  } else if (x >= 5 && x < 15) {
    // f2'(x) = 0.0256*(x - 10)^3
    return 0.0256 * Math.pow(x - 10, 3);
  } else if (x >= 15 && x <= 25) {
    // f3'(x) = -0.64*(x - 20)
    return -0.64 * (x - 20);
  } else {
    return 0;
  }
}

// f''(x): Returns the concavity of the track at a given x
function fDoublePrime(x) {
  if (x >= 0 && x < 5) {
    // f1''(x) = -0.64
    return -0.64;
  } else if (x >= 5 && x < 15) {
    // f2''(x) = 0.0768*(x - 10)^2
    return 0.0768 * Math.pow(x - 10, 2);
  } else if (x >= 15 && x <= 25) {
    // f3''(x) = -0.64
    return -0.64;
  } else {
    return 0;
  }
}

// --- 3. The Setup Function (Runs Once) ---
function setup() {
  // 800x400 pixel canvas
  let canvas = createCanvas(800, 400);
  // Tell the canvas to live inside the div we made in index.html
  canvas.parent('canvas-container');
  cartX = 0; // Start cart at x=0
  cartY = f(cartX);
  const playPauseBtn = document.getElementById('playPauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const speedSlider = document.getElementById('speedSlider');
  const speedValue = document.getElementById('speedValue');
  const gravityInput = document.getElementById('gravityInput');
  const gravityApplyBtn = document.getElementById('gravityApplyBtn');
  const initialSpeedInput = document.getElementById('initialSpeedInput');
  const initialSpeedApplyBtn = document.getElementById('initialSpeedApplyBtn');

  if (playPauseBtn && resetBtn && speedSlider && speedValue && gravityInput && gravityApplyBtn && initialSpeedInput && initialSpeedApplyBtn) {
    playPauseBtn.addEventListener('click', () => {
      running = !running;
      playPauseBtn.textContent = running ? 'Pause' : 'Play';
    });

    resetBtn.addEventListener('click', () => {
      cartX = 0;
      cartY = f(cartX);
    });

    speedSlider.addEventListener('input', () => {
      timeScale = parseFloat(speedSlider.value);
      speedValue.textContent = timeScale.toFixed(1) + 'x';
    });

    gravityInput.value = g.toFixed(2);
    initialSpeedInput.value = initialSpeed.toFixed(2);

    const applyGravity = () => {
      const newG = parseFloat(gravityInput.value);
      if (!isNaN(newG) && newG > 0 && newG <= 30) {
        g = newG;
        updateEnergyStartHeight();
      } else {
        gravityInput.value = g.toFixed(2);
      }
    };

    gravityApplyBtn.addEventListener('click', applyGravity);
    gravityInput.addEventListener('change', applyGravity);

    const applyInitialSpeed = () => {
      const newV0 = parseFloat(initialSpeedInput.value);
      if (!isNaN(newV0) && newV0 >= 0 && newV0 <= 50) {
        initialSpeed = newV0;
        updateEnergyStartHeight();
      } else {
        initialSpeedInput.value = initialSpeed.toFixed(2);
      }
    };

    initialSpeedApplyBtn.addEventListener('click', applyInitialSpeed);
    initialSpeedInput.addEventListener('change', applyInitialSpeed);
  }

  strokeWeight(4); // Thicker lines
}

// --- 4. The Draw Function (The Animation Loop) ---
function draw() {
  // --- A. Update Physics ---
  let h = f(cartX);
  let slope = fPrime(cartX);
  let concavity = fDoublePrime(cartX);

  // v = sqrt(2 * g * (start_height - current_height))
  let v = Math.sqrt(2 * g * (energyStartHeight - h));

  // dx/dt = v / sqrt(1 + slope^2)
  let horizontalVel = v / Math.sqrt(1 + slope * slope);
  // dy/dt = slope * (dx/dt)
  let verticalVel = slope * horizontalVel;
  
  // Get time passed since last frame (in seconds)
  let dt = (deltaTime / 1000) * timeScale; 

  // Update the cart's position
  if (running) {
    cartX += horizontalVel * dt;

    // Reset cart if it reaches the end
    if (cartX > 25) {
      cartX = 0;
    }
  }
  cartY = f(cartX); 

  // --- B. Draw Everything to the Screen ---
  background(210, 230, 255); // Light blue sky

  stroke(30, 64, 175);
  strokeWeight(4);
  noFill();
  rect(20, 20, width - 40, height - 40, 16);

  // --- C. Coordinate Transformation ---
  // Map our new [5m, 22m] height range to the canvas
  let screenX = map(cartX, 0, 25, 50, width - 50);
  let screenY = map(cartY, 5, 22, height - 50, 50);

  // --- D. Draw the Track ---
  stroke(60, 60, 60); // Dark grey track
  noFill();
  beginShape();
  for (let x = 0; x <= 25; x += 0.1) {
    let y = f(x);
    // Map each point to the new [5m, 22m] height range
    let plotX = map(x, 0, 25, 50, width - 50);
    let plotY = map(y, 5, 22, height - 50, 50);
    vertex(plotX, plotY);
  }
  endShape();
  
  // --- E. Calculate G-Force & Speed ---
  
  // Gs = ( (1 + f'(x)^2) + 2(h_start - h) * f''(x) ) / (1 + f'(x)^2)^(3/2)
  let numerator = (1 + slope*slope) + 2*(energyStartHeight - h) * concavity;
  let denominator = Math.pow(1 + slope*slope, 1.5);
  let Gs = numerator / denominator;
  
  // Calculate Speed in km/h (v is in m/s, so * 3.6)
  let speedKPH = v * 3.6;

  // --- F. Draw the Cart & Data Text ---
  
  // Save current drawing settings
  push();
  
  // Draw the text
  fill(0); // Black text
  noStroke();
  textSize(16);
  textAlign(LEFT);
  fill(255, 255, 255, 180); // Semi-transparent white box
  rect(screenX + 20, screenY - 10, 160, 50);
  fill(0); // Black text
  text("Speed: " + speedKPH.toFixed(1) + " km/h", screenX + 25, screenY + 10);
  text("G-Force: " + Gs.toFixed(2) + " Gs", screenX + 25, screenY + 30);
  
  // Draw the Cart
  stroke(200, 0, 0); // Red outline
  fill(255, 0, 0);   // Red fill
  circle(screenX, screenY, 20); // 20px circle
  
  // Restore drawing settings
  pop();
  
  // --- G. Draw Vectors ---
  
  // Save settings again
  push();
  
  // 1. Velocity Vector (Tangent)
  let v_scale = 5; // Scale factor: 5 pixels per m/s
  // We flip vy because p5's Y-axis is inverted
  strokeWeight(3);
  stroke(0, 150, 0); // Green
  line(screenX, screenY, 
       screenX + (horizontalVel * v_scale), 
       screenY - (verticalVel * v_scale));

  // 2. G-Force Vector (Normal)
  // The normal vector is perpendicular to the tangent (-slope, 1)
  let nx = -slope;
  let ny = 1;
  // Normalize it (make its length 1)
  let n_mag = sqrt(nx*nx + ny*ny);
  nx = nx / n_mag;
  ny = ny / n_mag;
  
  let g_scale = 20; // Scale factor: 20 pixels per G
  strokeWeight(3);
  stroke(0, 0, 200); // Blue
  // We draw (-nx, -ny) to point "up" and "out"
  line(screenX, screenY, 
       screenX + (nx * Gs * g_scale), 
       screenY - (ny * Gs * g_scale)); // Flip Y-axis
  
  // Restore settings
  pop();
}