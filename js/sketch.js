/* === ROLLER COASTER SIMULATOR (V3: VECTOR DISPLAY) ===
   - Deeper, steeper track for more "thrill"
   - Real-time G-force and Speed (km/h) display
   - ADDED: Tangent (Velocity) and Normal (G-Force) vectors
*/

// --- 1. Global Variables & Constants ---
const defaultG = 9.81;
const defaultInitialSpeed = 0.5;
let g = defaultG; // Acceleration due to gravity (m/s^2)
const trackStartHeight = 20.0; // The track's actual start height
const worldXMax = 50.0;
const landedPauseDuration = 1.5;
const teleportDuration = 1.5;
let initialSpeed = defaultInitialSpeed;

let energyStartHeight = trackStartHeight + (initialSpeed * initialSpeed) / (2 * g);

let cartX = 0.0; // Cart's current X position (in meters, 0 to 25)
let cartY = 0.0; // Cart's current Y position (in meters)
let running = true; // Whether the animation is running
let timeScale = 1.0; // Speed multiplier for the animation
let onTrack = true;
let projectileX = 0.0;
let projectileY = 0.0;
let projectileVx = 0.0;
let projectileVy = 0.0;
let hasLanded = false;
let landedTimer = 0.0;
let isTeleporting = false;
let teleportTimer = 0.0;
let landingX = 0.0;
let projectileTrail = [];
let rideTime = 0.0;
let arcDistance = 0.0;
let projectileEquationElement = null;
let projectileEquationTimeElement = null;
let projectileEquationXElement = null;

function formatProjectileNumber(n) {
  if (Number.isFinite(n)) {
    return n.toFixed(2);
  }
  return String(n);
}

function updateProjectileEquation(launchX, launchY, vx0, vy0) {
  if (!projectileEquationTimeElement || !projectileEquationXElement) {
    return;
  }

  if (!Number.isFinite(launchX) || !Number.isFinite(launchY) ||
      !Number.isFinite(vx0) || !Number.isFinite(vy0) || !Number.isFinite(g)) {
    const msg = "Projectile equation unavailable for this launch.";
    projectileEquationTimeElement.textContent = msg;
    projectileEquationXElement.textContent = msg;
    return;
  }

  const x0 = launchX;
  const y0 = launchY;

  const timeText = "x(t) = " + formatProjectileNumber(x0) +
    " + " + formatProjectileNumber(vx0) + " t, " +
    "y(t) = " + formatProjectileNumber(y0) +
    " + " + formatProjectileNumber(vy0) + " t - 0.5 * " +
    formatProjectileNumber(g) + " t^2";

  projectileEquationTimeElement.textContent = timeText;

  if (Math.abs(vx0) < 1e-6) {
    projectileEquationXElement.textContent = "y(x) is undefined for vertical launch (vx ≈ 0).";
    return;
  }

  const a = vy0 / vx0;
  const b = g / (2 * vx0 * vx0);
  const xText = "y(x) = " + formatProjectileNumber(y0) +
    " + " + formatProjectileNumber(a) + " (x - " + formatProjectileNumber(x0) + ")" +
    " - " + formatProjectileNumber(b) + " (x - " + formatProjectileNumber(x0) + ")^2";
  projectileEquationXElement.textContent = xText;
}

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
  } else if (x >= 15 && x < 25) {
    // f3(x) = 20.0 - 0.32*(x - 20)^2
    return 20.0 - 0.32 * Math.pow(x - 20, 2);
  } else if (x >= 25 && x <= 35) {
    // f4(x) = 0.32*(x - 30)^2 + 4.0 (deeper valley than f2)
    return 0.32 * Math.pow(x - 30, 2) + 4.0;
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
  } else if (x >= 15 && x < 25) {
    // f3'(x) = -0.64*(x - 20)
    return -0.64 * (x - 20);
  } else if (x >= 25 && x <= 35) {
    // f4'(x) = 0.64*(x - 30)
    return 0.64 * (x - 30);
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
  } else if (x >= 15 && x < 25) {
    // f3''(x) = -0.64
    return -0.64;
  } else if (x >= 25 && x <= 35) {
    // f4''(x) = 0.64
    return 0.64;
  } else {
    return 0;
  }
}

// --- 3. The Setup Function (Runs Once) ---
function setup() {
  // 1200x500 pixel canvas
  let canvas = createCanvas(1200, 500);
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
  const gravityResetBtn = document.getElementById('gravityResetBtn');
  const initialSpeedInput = document.getElementById('initialSpeedInput');
  const initialSpeedApplyBtn = document.getElementById('initialSpeedApplyBtn');
  const initialSpeedResetBtn = document.getElementById('initialSpeedResetBtn');
  const openOverlayBtn = document.getElementById('openCanvasOverlayBtn');
  const canvasOverlayBackdrop = document.getElementById('canvasOverlayBackdrop');
  const canvasOverlayCloseBtn = document.getElementById('canvasOverlayCloseBtn');
  const projectileEquationTime = document.getElementById('projectileEquationTime');
  const projectileEquationX = document.getElementById('projectileEquationX');

  projectileEquationElement = document.getElementById('projectileEquationBlock');
  projectileEquationTimeElement = projectileEquationTime;
  projectileEquationXElement = projectileEquationX;

  if (playPauseBtn && resetBtn && speedSlider && speedValue &&
    gravityInput && gravityApplyBtn && gravityResetBtn &&
    initialSpeedInput && initialSpeedApplyBtn && initialSpeedResetBtn &&
    projectileEquationTime && projectileEquationX) {

    projectileEquationTime.textContent = "Launch the cart to see x(t) and y(t).";
    projectileEquationX.textContent = "Launch the cart to see y(x).";

    playPauseBtn.addEventListener('click', () => {
      running = !running;
      playPauseBtn.textContent = running ? 'Pause' : 'Play';
    });

    resetBtn.addEventListener('click', () => {
      cartX = 0;
      cartY = f(cartX);
      onTrack = true;
      hasLanded = false;
      isTeleporting = false;
      landedTimer = 0.0;
      teleportTimer = 0.0;
      projectileX = 0.0;
      projectileY = 0.0;
      projectileVx = 0.0;
      projectileVy = 0.0;
      landingX = 0.0;
      projectileTrail = [];
      rideTime = 0.0;
      arcDistance = 0.0;
      if (projectileEquationTimeElement && projectileEquationXElement) {
        projectileEquationTimeElement.textContent = "Launch the cart to see x(t) and y(t).";
        projectileEquationXElement.textContent = "Launch the cart to see y(x).";
      }
    });

    speedSlider.addEventListener('input', () => {
      timeScale = parseFloat(speedSlider.value);
      speedValue.textContent = timeScale.toFixed(1) + 'x';
    });

    gravityInput.value = g.toFixed(2);
    initialSpeedInput.value = initialSpeed.toFixed(2);

    const applyGravity = () => {
      const newG = parseFloat(gravityInput.value);
      if (!isNaN(newG) && newG > 0 && newG <= 1000000000) {
        g = newG;
        updateEnergyStartHeight();
      } else {
        gravityInput.value = g.toFixed(2);
      }
    };

    gravityApplyBtn.addEventListener('click', applyGravity);
    gravityInput.addEventListener('change', applyGravity);

    gravityResetBtn.addEventListener('click', () => {
      g = defaultG;
      gravityInput.value = g.toFixed(2);
      updateEnergyStartHeight();
    });

    const applyInitialSpeed = () => {
      const newV0 = parseFloat(initialSpeedInput.value);
      if (!isNaN(newV0) && newV0 >= 0 && newV0 <= 1000000000) {
        initialSpeed = newV0;
        updateEnergyStartHeight();
      } else {
        initialSpeedInput.value = initialSpeed.toFixed(2);
      }
    };

    initialSpeedApplyBtn.addEventListener('click', applyInitialSpeed);
    initialSpeedInput.addEventListener('change', applyInitialSpeed);

    initialSpeedResetBtn.addEventListener('click', () => {
      initialSpeed = defaultInitialSpeed;
      initialSpeedInput.value = initialSpeed.toFixed(2);
      updateEnergyStartHeight();
    });

    if (openOverlayBtn && canvasOverlayBackdrop && canvasOverlayCloseBtn) {
      const openOverlay = () => {
        document.body.classList.add('canvas-overlay-active');
      };

      const closeOverlay = () => {
        document.body.classList.remove('canvas-overlay-active');
      };

      openOverlayBtn.addEventListener('click', openOverlay);
      canvasOverlayCloseBtn.addEventListener('click', closeOverlay);
      canvasOverlayBackdrop.addEventListener('click', closeOverlay);
    }
  }

  strokeWeight(4); // Thicker lines
}

// --- 4. The Draw Function (The Animation Loop) ---
function draw() {
  // --- A. Update Physics ---
  let dt = (deltaTime / 1000) * timeScale;
  let h = 0;
  let slope = 0;
  let concavity = 0;
  let v = 0;
  let horizontalVel = 0;
  let verticalVel = 0;

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

      if (cartX >= 35) {
        cartX = 35;
        cartY = f(cartX);
        projectileX = cartX;
        projectileY = cartY;
        projectileVx = horizontalVel;
        projectileVy = verticalVel;
        projectileTrail = [];
        projectileTrail.push({ x: projectileX, y: projectileY });
        onTrack = false;
        hasLanded = false;
        isTeleporting = false;

        landedTimer = 0.0;
        teleportTimer = 0.0;
        landingX = projectileX;
        updateProjectileEquation(projectileX, projectileY, projectileVx, projectileVy);
      } else {
        cartY = f(cartX);
      }
    } else {
      cartY = f(cartX);
    }
  } else if (!hasLanded && !isTeleporting) {
    // Projectile flight phase
    if (running) {
      projectileVy -= g * dt;
      projectileX += projectileVx * dt;
      projectileY += projectileVy * dt;

      if (projectileY <= 0) {
        projectileY = 0;
        hasLanded = true;
        landedTimer = 0.0;
        projectileVy = 0.0;
        landingX = projectileX;
      }

      projectileTrail.push({ x: projectileX, y: projectileY });
    }

    cartX = projectileX;
    cartY = projectileY;

    v = Math.sqrt(projectileVx * projectileVx + projectileVy * projectileVy);
    horizontalVel = projectileVx;
    verticalVel = projectileVy;
    slope = 0;
    concavity = 0;

    if (running) {
      rideTime += dt;
      arcDistance += v * dt;
    }
  } else if (hasLanded && !isTeleporting) {
    // Landed on the ground: pause before teleport
    cartX = projectileX;
    cartY = 0;

    v = 0;
    horizontalVel = 0;
    verticalVel = 0;
    slope = 0;
    concavity = 0;

    if (running) {
      landedTimer += dt;
      if (landedTimer >= landedPauseDuration) {
        isTeleporting = true;
        teleportTimer = 0.0;
      }
    }
  } else if (hasLanded && isTeleporting) {
    // Teleportation phase: move from landing point back to start of the track
    if (running) {
      teleportTimer += dt;
      if (teleportTimer >= teleportDuration) {
        // Respawn at the beginning of the track and start again
        cartX = 0;
        cartY = f(cartX);
        onTrack = true;
        hasLanded = false;
        isTeleporting = false;
        projectileX = 0.0;
        projectileY = 0.0;
        projectileVx = 0.0;
        projectileVy = 0.0;
        projectileTrail = [];
        rideTime = 0.0;
        arcDistance = 0.0;
        landingX = 0.0;
      } else {
        let t = teleportTimer / teleportDuration;

        if (t < 0) t = 0;
        if (t > 1) t = 1;
        let startX = 0;
        let startY = f(0);
        let curX = landingX + (startX - landingX) * t;
        let curY = 0 + (startY - 0) * t;
        cartX = curX;
        cartY = curY;
      }
    }

    if (!onTrack) {
      v = 0;
      horizontalVel = 0;
      verticalVel = 0;
      slope = 0;
      concavity = 0;
    } else {
      h = f(cartX);
      slope = fPrime(cartX);
      concavity = fDoublePrime(cartX);
      v = 0;
      horizontalVel = 0;
      verticalVel = 0;
    }
  }

  // For non-track phases, set height to the cart's current y for G-force formula
  if (!onTrack || hasLanded || isTeleporting) {
    h = cartY;
  }

  let baseWorldXMax = worldXMax;
  let farthestX = Math.max(cartX, projectileX, landingX);
  let paddingX = 5.0;
  let maxZoomOutFactor = 2.0;
  // Horizontal zoom based on farthest point we need to see.
  // Teleportation can later force this back to the base range.
  let candidateMax = Math.max(baseWorldXMax, farthestX + paddingX);
  let displayWorldXMax = Math.min(candidateMax, baseWorldXMax * maxZoomOutFactor);

  let baseWorldYMax = 22.0;
  let farthestY = Math.max(cartY, projectileY, f(0), f(35));
  let paddingY = 2.0;
  let maxZoomOutYFactor = 2.0;
  let candidateYMax = Math.max(baseWorldYMax, farthestY + paddingY);
  let displayWorldYMax = Math.min(candidateYMax, baseWorldYMax * maxZoomOutYFactor);

  // Once teleportation has been in progress for at least 0.5 s,
  // lock the zoom back to the default world extents.
  if (isTeleporting && teleportTimer >= 0.5) {
    displayWorldXMax = baseWorldXMax;
    displayWorldYMax = baseWorldYMax;
  }

  // --- B. Draw Everything to the Screen ---
  background(210, 230, 255); // Light blue sky

  stroke(30, 64, 175);
  strokeWeight(4);
  noFill();
  rect(20, 20, width - 40, height - 40, 16);

  // --- C. Coordinate Transformation ---
  // Map our new [0m, 22m] height range to the canvas
  let screenX = map(cartX, 0, displayWorldXMax, 50, width - 50);

  let screenY = map(cartY, 0, displayWorldYMax, height - 50, 50);

  // Draw ground at y = 0
  stroke(120, 100, 80);
  strokeWeight(3);
  let groundY = map(0, 0, displayWorldYMax, height - 50, 50);
  line(50, groundY, width - 50, groundY);

  // --- D. Draw the Track ---
  stroke(60, 60, 60); // Dark grey track
  noFill();
  beginShape();
  for (let x = 0; x <= 35; x += 0.1) {
    let y = f(x);
    // Map each point to the new [0m, 22m] height range
    let plotX = map(x, 0, displayWorldXMax, 50, width - 50);
    let plotY = map(y, 0, displayWorldYMax, height - 50, 50);
    vertex(plotX, plotY);
  }
  endShape();

  // --- E. Calculate G-Force & Speed ---
  // Gs = ( (1 + f'(x)^2) + 2(h_start - h) * f''(x) ) / (1 + f'(x)^2)^(3/2)
  let numerator = (1 + slope * slope) + 2 * (energyStartHeight - h) * concavity;
  let denominator = Math.pow(1 + slope * slope, 1.5);
  let Gs = numerator / denominator;

  // Calculate Speed in km/h (v is in m/s, so * 3.6)
  let speedKPH = v * 3.6;

  // --- F. Draw the Cart & Data Text ---
  // Save current drawing settings
  push();

  if (!isTeleporting) {

    // Draw the text
    fill(0); // Black text
    noStroke();
    textSize(16);
    textAlign(LEFT);

    // Base HUD position next to the cart
    let hudWidth = 220;
    let hudHeight = 130;
    let margin = 25;

    // Treat the cart as a small box for overlap checks
    let cartRadius = 10;
    let cartLeft = screenX - cartRadius;
    let cartRight = screenX + cartRadius;
    let cartTop = screenY - cartRadius;
    let cartBottom = screenY + cartRadius;

    // Candidate HUD positions around the cart. We will clamp each
    // candidate to the canvas margins and pick the first that does
    // not overlap the cart box.
    let candidates = [
      // Right of cart
      { x: screenX + 20, y: screenY - hudHeight / 2 },
      // Above cart
      { x: screenX - hudWidth / 2, y: screenY - hudHeight - 20 },
      // Below cart
      { x: screenX - hudWidth / 2, y: screenY + 20 },
      // Left of cart
      { x: screenX - hudWidth - 20, y: screenY - hudHeight / 2 }
    ];

    // Default to the first candidate; we will refine below
    let hudX = candidates[0].x;
    let hudY = candidates[0].y;

    for (let i = 0; i < candidates.length; i++) {
      let c = candidates[i];

      // Clamp candidate inside margins
      let candidateX = Math.min(
        Math.max(c.x, margin),
        width - margin - hudWidth
      );
      let candidateY = Math.min(
        Math.max(c.y, margin),
        height - margin - hudHeight
      );

      let hudLeft = candidateX;
      let hudRight = candidateX + hudWidth;
      let hudTop = candidateY;
      let hudBottom = candidateY + hudHeight;

      let overlapsCart = !(
        hudLeft > cartRight ||
        hudRight < cartLeft ||
        hudTop > cartBottom ||
        hudBottom < cartTop
      );

      if (!overlapsCart) {
        hudX = candidateX;
        hudY = candidateY;
        break;
      }
    }

    fill(255, 255, 255, 180); // Semi-transparent white box
    rect(hudX, hudY, hudWidth, hudHeight);
    fill(0); // Black text
    text("Speed: " + speedKPH.toFixed(1) + " km/h", hudX + 5, hudY + 20);
    text("G-Force: " + Gs.toFixed(2) + " Gs", hudX + 5, hudY + 40);
    text("Vx: " + horizontalVel.toFixed(2) + " m/s", hudX + 5, hudY + 60);
    text("Vy: " + verticalVel.toFixed(2) + " m/s", hudX + 5, hudY + 80);
    text("Dist: " + arcDistance.toFixed(2) + " m", hudX + 5, hudY + 100);
    text("Time: " + rideTime.toFixed(2) + " s", hudX + 5, hudY + 120);
  }

  // Projectile trail (dotted red/blue) during projectile flight
  if (!onTrack && !hasLanded && !isTeleporting && projectileTrail.length > 1) {
    noStroke();
    for (let i = 0; i < projectileTrail.length; i += 2) {
      let p = projectileTrail[i];
      let px = map(p.x, 0, displayWorldXMax, 50, width - 50);
      let py = map(p.y, 0, displayWorldYMax, height - 50, 50);
      if (((i / 2) % 2) === 0) {
        fill(255, 0, 0); // red
      } else {
        fill(30, 64, 175); // blue-ish
      }
      circle(px, py, 4);
    }
  }

  // Draw the Cart
  stroke(200, 0, 0); // Red outline
  fill(255, 0, 0); // Red fill
  if (!isTeleporting) {
    circle(screenX, screenY, 20); // 20px circle
  }

  // Teleportation pixel effect
  if (isTeleporting) {
    let landingScreenX = map(landingX, 0, displayWorldXMax, 50, width - 50);
    let landingScreenY = groundY;
    let startScreenX = map(0, 0, displayWorldXMax, 50, width - 50);
    let startScreenY = map(f(0), 0, displayWorldYMax, height - 50, 50);
    let steps = 30;
    let progress = teleportTimer / teleportDuration;
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;
    noStroke();
    for (let i = 0; i < steps; i++) {
      let frac = (i + 1) / steps;
      if (frac > progress) {
        continue;
      }
      let px = landingScreenX + (startScreenX - landingScreenX) * frac;
      let pyBase = landingScreenY + (startScreenY - landingScreenY) * frac;
      let jitterX = random(-3, 3);
      let jitterY = random(-3, 3);
      let size = random(3, 5);
      fill(255, 0, 0, 210);
      rect(px + jitterX, pyBase + jitterY, size, size);
    }
  }

  // Restore drawing settings
  pop();

  // --- G. Draw Vectors ---
  if (!isTeleporting) {
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
}