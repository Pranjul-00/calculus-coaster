/* === ROLLER COASTER SIMULATOR (V8: FINAL WITH UI STATS) ===
   - Stops automatically on landing
   - Calculates Projectile Range
   - ADDED: Live UI updates for Arc Length and Time
   - Coordinate Grid enabled
*/

// --- 1. Global Variables & Constants ---
const defaultG = 9.81;
const defaultInitialSpeed = 0.5;
let g = defaultG; 
const trackStartHeight = 20.0; 
const worldXMax = 50.0;
const landedPauseDuration = 1.5; 
const teleportDuration = 1.5;
let initialSpeed = defaultInitialSpeed;

let energyStartHeight = trackStartHeight + (initialSpeed * initialSpeed) / (2 * g);

// Sticky camera bounds
let cameraWorldXMax = worldXMax;
let cameraWorldYMax = 22.0;

let cartX = 0.0; 
let cartY = 0.0; 
let running = true; 
let timeScale = 1.0; 
let onTrack = true;
let projectileX = 0.0;
let projectileY = 0.0;
let projectileVx = 0.0;
let projectileVy = 0.0;
let hasLanded = false;
let landingX = 0.0;
let projectileRange = 0.0;
let projectileTrail = [];
let rideTime = 0.0;
let arcDistance = 0.0;

// DOM Elements
let projectileEquationElement = null;
let projectileEquationTimeElement = null;
let projectileEquationXElement = null;
let trackTimeElement = null;
let trackDistanceElement = null;
let totalTimeElement = null;
let trackTime = null;
let totalTime = null;
let trackDistance = null;
let totalDistance = null;

let lastLaunchX = null;
let lastLaunchY = null;
let lastLaunchVx = null;
let lastLaunchVy = null;

function formatProjectileNumber(n) {
  if (Number.isFinite(n)) return n.toFixed(2);
  return String(n);
}

function updateProjectileEquation(launchX, launchY, vx0, vy0) {
  if (!projectileEquationTimeElement || !projectileEquationXElement) return;

  const x0 = launchX; const y0 = launchY;
  const x0Str = formatProjectileNumber(x0); const y0Str = formatProjectileNumber(y0);
  const vx0Str = formatProjectileNumber(vx0); const vy0Str = formatProjectileNumber(vy0);
  const gStr = formatProjectileNumber(g); const gHalf = 0.5 * g; const gHalfStr = formatProjectileNumber(gHalf);

  lastLaunchX = x0; lastLaunchY = y0; lastLaunchVx = vx0; lastLaunchVy = vy0;

  const timeLatex = "\\begin{aligned}x(t) &= " + x0Str + " + " + vx0Str + " t\\\\y(t) &= " + y0Str + " + " + vy0Str + " t - " + gHalfStr + " t^2\\end{aligned}";

  if (window.katex && window.katex.render) {
    projectileEquationTimeElement.innerHTML = "";
    window.katex.render(timeLatex, projectileEquationTimeElement, { displayMode: true, throwOnError: false });
  } else {
    projectileEquationTimeElement.textContent = "x(t) = ...";
  }

  if (Math.abs(vx0) < 1e-6) {
    projectileEquationXElement.textContent = "y(x) is undefined for vertical launch.";
    return;
  }

  const a = vy0 / vx0; const b = g / (2 * vx0 * vx0);
  const A = -b; const B = a + 2 * b * x0; const C = y0 - a * x0 - b * x0 * x0;
  const AStr = formatProjectileNumber(A); const BStr = formatProjectileNumber(B); const CStr = formatProjectileNumber(C);

  const xLatex = "\\begin{aligned}y(x) &= " + AStr + " x^2 + " + BStr + " x + " + CStr + "\\end{aligned}";

  if (window.katex && window.katex.render) {
    projectileEquationXElement.innerHTML = "";
    window.katex.render(xLatex, projectileEquationXElement, { displayMode: true, throwOnError: false });
  } else {
    projectileEquationXElement.textContent = "y(x) = ...";
  }
}

function updateEnergyStartHeight() {
  energyStartHeight = trackStartHeight + (initialSpeed * initialSpeed) / (2 * g);
}

// --- 2. Track Functions ---
function f(x) {
  if (x >= 0 && x < 5) return 20.0 - 0.32 * Math.pow(x, 2);
  else if (x >= 5 && x < 15) return 0.0064 * Math.pow(x - 10, 4) + 8.0;
  else if (x >= 15 && x < 25) return 20.0 - 0.32 * Math.pow(x - 20, 2);
  else if (x >= 25 && x <= 35) return 0.32 * Math.pow(x - 30, 2) + 4.0;
  else return trackStartHeight;
}

function fPrime(x) {
  if (x >= 0 && x < 5) return -0.64 * x;
  else if (x >= 5 && x < 15) return 0.0256 * Math.pow(x - 10, 3);
  else if (x >= 15 && x < 25) return -0.64 * (x - 20);
  else if (x >= 25 && x <= 35) return 0.64 * (x - 30);
  else return 0;
}

function fDoublePrime(x) {
  if (x >= 0 && x < 5) return -0.64;
  else if (x >= 5 && x < 15) return 0.0768 * Math.pow(x - 10, 2);
  else if (x >= 15 && x < 25) return -0.64;
  else if (x >= 25 && x <= 35) return 0.64;
  else return 0;
}

// --- 3. Setup ---
function setup() {
  let canvas = createCanvas(1200, 500);
  canvas.parent('canvas-container');
  cartX = 0; cartY = f(cartX);
  
  const playPauseBtn = document.getElementById('playPauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const speedSlider = document.getElementById('speedSlider');
  const speedValue = document.getElementById('speedValue');
  const gravityInput = document.getElementById('gravityInput');
  const gravityApplyBtn = document.getElementById('gravityApplyBtn');
  const gravityResetBtn = document.getElementById('gravityResetBtn');
  const initialSpeedInput = document.getElementById('initialSpeedInput');
  const initialSpeedApplyBtn = document.getElementById('initialSpeedApplyBtn');
  const initialSpeedResetBtn = document.getElementById('initialSpeedResetBtn');
  const openOverlayBtn = document.getElementById('openCanvasOverlayBtn');
  const canvasOverlayBackdrop = document.getElementById('canvasOverlayBackdrop');
  const canvasOverlayCloseBtn = document.getElementById('canvasOverlayCloseBtn');
  
  const projectileEquationTime = document.getElementById('projectileEquationTime');
  const projectileEquationX = document.getElementById('projectileEquationX');
  
  // NEW DOM ELEMENTS FOR STATS
  const trackTimeDisplay = document.getElementById('trackTimeDisplay');
  const trackDistanceDisplay = document.getElementById('trackDistanceDisplay');
  const totalTimeDisplay = document.getElementById('totalTimeDisplay');

  projectileEquationElement = document.getElementById('projectileEquationBlock');
  projectileEquationTimeElement = projectileEquationTime;
  projectileEquationXElement = projectileEquationX;
  
  trackTimeElement = trackTimeDisplay;
  trackDistanceElement = trackDistanceDisplay; // Capture reference
  totalTimeElement = totalTimeDisplay;

  if (playPauseBtn) {
    projectileEquationTime.textContent = "Launch the cart to see x(t) and y(t).";
    projectileEquationX.textContent = "Launch the cart to see y(x).";
    
    // Set initial text
    if (trackTimeElement) trackTimeElement.textContent = "0.00 s";
    if (trackDistanceElement) trackDistanceElement.textContent = "0.00 m";
    if (totalTimeElement) totalTimeElement.textContent = "--";

    playPauseBtn.addEventListener('click', () => {
      if (hasLanded) {
         resetSimulation();
      } else {
         running = !running;
         playPauseBtn.textContent = running ? 'Pause' : 'Play';
      }
    });

    resetBtn.addEventListener('click', resetSimulation);

    function resetSimulation() {
      cartX = 0; cartY = f(cartX); onTrack = true; hasLanded = false;
      projectileX = 0.0; projectileY = 0.0; projectileVx = 0.0; projectileVy = 0.0;
      landingX = 0.0; projectileRange = 0.0; projectileTrail = [];
      rideTime = 0.0; arcDistance = 0.0; 
      cameraWorldXMax = worldXMax; cameraWorldYMax = 22.0;
      trackTime = null; totalTime = null; trackDistance = null; totalDistance = null;
      running = true; 
      playPauseBtn.textContent = 'Pause';
      
      // Reset text
      if (trackTimeElement) trackTimeElement.textContent = "0.00 s";
      if (trackDistanceElement) trackDistanceElement.textContent = "0.00 m";
      if (totalTimeElement) totalTimeElement.textContent = "--";
    }

    speedSlider.addEventListener('input', () => {
      timeScale = parseFloat(speedSlider.value);
      speedValue.textContent = timeScale.toFixed(1) + 'x';
    });

    gravityInput.value = g.toFixed(2);
    initialSpeedInput.value = initialSpeed.toFixed(2);

    const applyGravity = () => {
      const newG = parseFloat(gravityInput.value);
      if (!isNaN(newG) && newG > 0) { g = newG; updateEnergyStartHeight(); } 
      else { gravityInput.value = g.toFixed(2); }
    };
    gravityApplyBtn.addEventListener('click', applyGravity);
    gravityResetBtn.addEventListener('click', () => { g = defaultG; gravityInput.value = g.toFixed(2); updateEnergyStartHeight(); });

    const applyInitialSpeed = () => {
      const newV0 = parseFloat(initialSpeedInput.value);
      if (!isNaN(newV0) && newV0 >= 0) { initialSpeed = newV0; updateEnergyStartHeight(); } 
      else { initialSpeedInput.value = initialSpeed.toFixed(2); }
    };
    initialSpeedApplyBtn.addEventListener('click', applyInitialSpeed);
    initialSpeedResetBtn.addEventListener('click', () => { initialSpeed = defaultInitialSpeed; initialSpeedInput.value = initialSpeed.toFixed(2); updateEnergyStartHeight(); });

    if (openOverlayBtn) {
      openOverlayBtn.addEventListener('click', () => document.body.classList.add('canvas-overlay-active'));
      canvasOverlayCloseBtn.addEventListener('click', () => document.body.classList.remove('canvas-overlay-active'));
      canvasOverlayBackdrop.addEventListener('click', () => document.body.classList.remove('canvas-overlay-active'));
    }
  }
  strokeWeight(4);
}

// --- 4. Draw Loop ---
function draw() {
  let dt = (deltaTime / 1000) * timeScale;
  let h = 0; let slope = 0; let concavity = 0;
  let v = 0; let horizontalVel = 0; let verticalVel = 0;

  // --- PHYSICS UPDATES ---
  if (onTrack) {
    h = f(cartX);
    slope = fPrime(cartX);
    concavity = fDoublePrime(cartX);
    v = Math.sqrt(2 * g * (energyStartHeight - h));
    horizontalVel = v / Math.sqrt(1 + slope * slope);
    verticalVel = slope * horizontalVel;

    if (running) {
      rideTime += dt;
      arcDistance += v * dt;
      cartX += horizontalVel * dt;
      
      // LIVE UPDATE: Update distance/time while running
      if (trackDistanceElement) trackDistanceElement.textContent = arcDistance.toFixed(2) + " m";
      if (trackTimeElement) trackTimeElement.textContent = rideTime.toFixed(2) + " s";

      if (cartX >= 35) {
        cartX = 35; cartY = f(cartX);
        projectileX = cartX; projectileY = cartY;
        projectileVx = horizontalVel; projectileVy = verticalVel;
        projectileTrail = []; projectileTrail.push({ x: projectileX, y: projectileY });
        onTrack = false; hasLanded = false;
        if (trackTime === null) {
          trackTime = rideTime; trackDistance = arcDistance;
          // Final freeze of track stats
          if (trackTimeElement) trackTimeElement.textContent = trackTime.toFixed(2) + " s";
          if (trackDistanceElement) trackDistanceElement.textContent = trackDistance.toFixed(2) + " m";
        }
        updateProjectileEquation(projectileX, projectileY, projectileVx, projectileVy);
      } else { cartY = f(cartX); }
    } else { cartY = f(cartX); }
  } 
  else if (!hasLanded) {
    // Projectile Mode
    if (running) {
      rideTime += dt; // Keep adding to total time
      
      projectileVy -= g * dt;
      projectileX += projectileVx * dt;
      projectileY += projectileVy * dt;

      // Check Landing
      if (projectileY <= 0) {
        projectileY = 0;
        hasLanded = true; 
        running = false; 
        document.getElementById('playPauseBtn').textContent = "Restart"; 
        
        landingX = projectileX;
        projectileRange = landingX - 35.0; 

        if (totalTime === null) {
          totalTime = rideTime; totalDistance = arcDistance;
          if (totalTimeElement) totalTimeElement.textContent = totalTime.toFixed(2) + " s";
        }
      }
      projectileTrail.push({ x: projectileX, y: projectileY });
    }
    cartX = projectileX; cartY = projectileY;
    v = Math.sqrt(projectileVx * projectileVx + projectileVy * projectileVy);
    horizontalVel = projectileVx; verticalVel = projectileVy;
    slope = 0; concavity = 0;
  } else {
    // Landed
    cartX = projectileX; cartY = 0;
    v = 0; horizontalVel = 0; verticalVel = 0; slope = 0; concavity = 0;
  }

  // --- RENDERING ---
  if (!onTrack || hasLanded) h = cartY;

  // Camera handling
  let baseWorldXMax = worldXMax; let baseWorldYMax = 22.0; let paddingX = 5.0; let paddingY = 2.0;
  let farthestX = Math.max(cartX, projectileX, landingX);
  let farthestY = Math.max(cartY, projectileY, f(0), f(35));
  let requestedXMax = Math.max(baseWorldXMax, farthestX + paddingX);
  let requestedYMax = Math.max(baseWorldYMax, farthestY + paddingY);
  cameraWorldXMax = Math.max(cameraWorldXMax, requestedXMax);
  cameraWorldYMax = Math.max(cameraWorldYMax, requestedYMax);
  let displayWorldXMax = cameraWorldXMax; let displayWorldYMax = cameraWorldYMax;

  background(210, 230, 255);

  // --- COORDINATE GRID ---
  push();
  stroke(255, 255, 255, 100); strokeWeight(1); textSize(10); fill(100); noStroke();
  for (let gx = 0; gx <= displayWorldXMax; gx += 5) {
    let sx = map(gx, 0, displayWorldXMax, 50, width - 50);
    stroke(255); line(sx, 50, sx, height - 50);
    noStroke(); text(gx + "m", sx - 10, height - 35);
  }
  for (let gy = 0; gy <= displayWorldYMax; gy += 5) {
    let sy = map(gy, 0, displayWorldYMax, height - 50, 50);
    stroke(255); line(50, sy, width - 50, sy);
    noStroke(); text(gy + "m", 25, sy + 4);
  }
  pop();

  stroke(30, 64, 175); strokeWeight(4); noFill();
  rect(20, 20, width - 40, height - 40, 16);

  let screenX = map(cartX, 0, displayWorldXMax, 50, width - 50);
  let screenY = map(cartY, 0, displayWorldYMax, height - 50, 50);
  let groundY = map(0, 0, displayWorldYMax, height - 50, 50);
  stroke(120, 100, 80); strokeWeight(3); line(50, groundY, width - 50, groundY);

  stroke(60, 60, 60); noFill(); beginShape();
  for (let x = 0; x <= 35; x += 0.1) {
    let y = f(x);
    let plotX = map(x, 0, displayWorldXMax, 50, width - 50);
    let plotY = map(y, 0, displayWorldYMax, height - 50, 50);
    vertex(plotX, plotY);
  }
  endShape();

  let numerator = (1 + slope * slope) + 2 * (energyStartHeight - h) * concavity;
  let denominator = Math.pow(1 + slope * slope, 1.5);
  let Gs = numerator / denominator;
  let speedKPH = v * 3.6;

  // --- LIVE HUD ON CANVAS ---
  push();
  if (running || (!hasLanded && !running)) {
    fill(0); noStroke(); textSize(16); textAlign(LEFT);
    let hudWidth = 230; let hudHeight = 175; let margin = 25;
    let candidates = [
      { x: screenX + 20, y: screenY - hudHeight / 2 },
      { x: screenX - hudWidth / 2, y: screenY - hudHeight - 20 },
      { x: screenX - hudWidth / 2, y: screenY + 20 },
      { x: screenX - hudWidth - 20, y: screenY - hudHeight / 2 }
    ];
    let hudX = candidates[0].x; let hudY = candidates[0].y; 
    
    // Choose HUD position
    for (let i = 0; i < candidates.length; i++) {
      let c = candidates[i];
      let candidateX = Math.min(Math.max(c.x, margin), width - margin - hudWidth);
      let candidateY = Math.min(Math.max(c.y, margin), height - margin - hudHeight);
      let hudLeft = candidateX; let hudRight = candidateX + hudWidth;
      let hudTop = candidateY; let hudBottom = candidateY + hudHeight;
      let cartRadius = 10;
      let cartLeft = screenX - cartRadius; let cartRight = screenX + cartRadius;
      let cartTop = screenY - cartRadius; let cartBottom = screenY + cartRadius;
      let overlapsCart = !(hudLeft > cartRight || hudRight < cartLeft || hudTop > cartBottom || hudBottom < cartTop);
      if (!overlapsCart) { hudX = candidateX; hudY = candidateY; break; }
    }

    fill(255, 255, 255, 180); rect(hudX, hudY, hudWidth, hudHeight); fill(0);
    
    // Live Data Display
    text("Height: " + cartY.toFixed(2) + " m", hudX + 5, hudY + 20);
    text("Position x: " + cartX.toFixed(2) + " m", hudX + 5, hudY + 40);
    text("Speed: " + speedKPH.toFixed(1) + " km/h", hudX + 5, hudY + 65);
    text("G-Force: " + Gs.toFixed(2) + " Gs", hudX + 5, hudY + 85);
    text("Vx: " + horizontalVel.toFixed(2) + " m/s", hudX + 5, hudY + 105);
    text("Vy: " + verticalVel.toFixed(2) + " m/s", hudX + 5, hudY + 125);
    // Removed duplicate dist/time from HUD since it's now below canvas
  }

  if (!onTrack && projectileTrail.length > 1) {
    noStroke();
    for (let i = 0; i < projectileTrail.length; i += 2) {
      let p = projectileTrail[i];
      let px = map(p.x, 0, displayWorldXMax, 50, width - 50);
      let py = map(p.y, 0, displayWorldYMax, height - 50, 50);
      if (((i / 2) % 2) === 0) fill(255, 0, 0); else fill(30, 64, 175);
      circle(px, py, 4);
    }
  }

  stroke(200, 0, 0); fill(255, 0, 0); circle(screenX, screenY, 20);
  pop();

  if (!hasLanded) {
    push();
    let v_scale = 5; strokeWeight(3); stroke(0, 150, 0);
    line(screenX, screenY, screenX + (horizontalVel * v_scale), screenY - (verticalVel * v_scale));
    let nx = -slope; let ny = 1; let n_mag = sqrt(nx * nx + ny * ny); nx = nx / n_mag; ny = ny / n_mag;
    let g_scale = 20; stroke(0, 0, 200);
    line(screenX, screenY, screenX + (nx * Gs * g_scale), screenY - (ny * Gs * g_scale));
    pop();
  }
}