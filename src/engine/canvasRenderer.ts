import {
  AnimationProject,
  CameraMotion,
  CharacterActionSpec,
  CharacterSpec,
  DialogueLineSpec,
  EnvironmentTheme,
  ForegroundProp,
  RenderOptions,
  SceneSpec,
  ShotType,
  TimeOfDay,
  WeatherEffect,
  formatTimecode,
  resolveSceneAtFrame,
} from '../types/animation';

// Fixed studio ground plane ratio (74% down from top of frame)
export const STAGE_GROUND_RATIO = 0.74;

// Reusable offscreen buffer for smooth 24 FPS cross-dissolve scene transitions
let transitionBufferCanvas: HTMLCanvasElement | null = null;

export function clearRendererMemory(): void {
  if (transitionBufferCanvas) {
    const ctx = transitionBufferCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, transitionBufferCanvas.width, transitionBufferCanvas.height);
    }
    transitionBufferCanvas = null;
  }
}

function getTransitionBuffer(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!transitionBufferCanvas) {
    transitionBufferCanvas = document.createElement('canvas');
  }
  if (transitionBufferCanvas.width !== width || transitionBufferCanvas.height !== height) {
    transitionBufferCanvas.width = width;
    transitionBufferCanvas.height = height;
  }
  return transitionBufferCanvas;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getSkyPalette(
  theme: EnvironmentTheme,
  timeOfDay: TimeOfDay
): { top: string; mid: string; bottom: string; groundTop: string; groundBottom: string } {
  if (theme === 'tropical_beach') {
    if (timeOfDay === 'dawn') {
      return {
        top: '#312E81',
        mid: '#F472B6',
        bottom: '#FDE68A',
        groundTop: '#FEF3C7',
        groundBottom: '#F59E0B',
      };
    }
    if (timeOfDay === 'day') {
      return {
        top: '#0284C7',
        mid: '#38BDF8',
        bottom: '#BAE6FD',
        groundTop: '#FEF9C3',
        groundBottom: '#FDE047',
      };
    }
    if (timeOfDay === 'night') {
      return {
        top: '#020617',
        mid: '#0F172A',
        bottom: '#1E293B',
        groundTop: '#334155',
        groundBottom: '#1E293B',
      };
    }
    return {
      top: '#4C1D95',
      mid: '#F97316',
      bottom: '#FDE047',
      groundTop: '#FEF3C7',
      groundBottom: '#F59E0B',
    };
  }

  if (theme === 'space_station') {
    return {
      top: '#030712',
      mid: '#0F172A',
      bottom: '#1E1B4B',
      groundTop: '#1E293B',
      groundBottom: '#090D16',
    };
  }
  if (theme === 'cyber_city') {
    return {
      top: '#090D16',
      mid: '#1E1B4B',
      bottom: '#3B0764',
      groundTop: '#0F172A',
      groundBottom: '#020617',
    };
  }
  if (theme === 'water_drop_macro') {
    return {
      top: '#090D16',
      mid: '#1C1917',
      bottom: '#451A03',
      groundTop: '#292524',
      groundBottom: '#0C0A09',
    };
  }
  if (theme === 'candy_shop') {
    return {
      top: '#FDF2F8',
      mid: '#FCE7F3',
      bottom: '#FEF3C7',
      groundTop: '#FDE68A',
      groundBottom: '#D97706',
    };
  }
  if (theme === 'cozy_studio') {
    return {
      top: '#451A03',
      mid: '#78350F',
      bottom: '#92400E',
      groundTop: '#3E2723',
      groundBottom: '#1C1917',
    };
  }

  switch (timeOfDay) {
    case 'dawn':
      return {
        top: '#1E1B4B',
        mid: '#7C2D12',
        bottom: '#F59E0B',
        groundTop: '#1E293B',
        groundBottom: '#0F172A',
      };
    case 'day':
      return {
        top: '#0284C7',
        mid: '#38BDF8',
        bottom: '#BAE6FD',
        groundTop: theme === 'sunset_desert' ? '#D97706' : '#15803D',
        groundBottom: theme === 'sunset_desert' ? '#78350F' : '#052E16',
      };
    case 'dusk':
      return {
        top: '#1E1B4B',
        mid: '#9A3412',
        bottom: '#F97316',
        groundTop: theme === 'sunset_desert' ? '#92400E' : '#1E293B',
        groundBottom: '#090D16',
      };
    case 'night':
    default:
      return {
        top: '#020617',
        mid: '#0F172A',
        bottom: '#1E293B',
        groundTop: '#0F172A',
        groundBottom: '#020617',
      };
  }
}

function getCameraTransform(
  motion: CameraMotion,
  shotType: ShotType,
  progress: number,
  width: number,
  height: number,
  sceneIndex = 0,
  totalScenes = 1
): { scale: number; tx: number; ty: number; focalX: number; focalY: number } {
  const eased = easeInOutCubic(clamp(progress, 0, 1));
  const focalX = width / 2;
  const focalY = height * STAGE_GROUND_RATIO;

  // Cohesive storytelling lens scales so cuts never jump jarring amounts
  let baseScale = 1.0;
  if (shotType === 'wide') baseScale = 0.94;
  else if (shotType === 'medium') baseScale = 1.06;
  else if (shotType === 'close_up') baseScale = 1.24;
  else if (shotType === 'over_shoulder') baseScale = 1.02;

  // Continuous story-wide progress prevents the background from snapping back at Scene 2 Frame 0
  const storySpan = Math.max(1, totalScenes);
  const storyProgress = clamp((sceneIndex + eased) / storySpan, 0, 1);

  switch (motion) {
    case 'pan_left':
      return {
        scale: baseScale * 1.03,
        tx: lerp(-32, 32, storyProgress),
        ty: 0,
        focalX,
        focalY,
      };
    case 'pan_right':
      return {
        scale: baseScale * 1.03,
        tx: lerp(32, -32, storyProgress),
        ty: 0,
        focalX,
        focalY,
      };
    case 'zoom_in':
      return {
        scale: lerp(baseScale * 0.97, baseScale * 1.08, eased),
        tx: lerp(14, -14, storyProgress),
        ty: 0,
        focalX,
        focalY,
      };
    case 'zoom_out':
      return {
        scale: lerp(baseScale * 1.08, baseScale * 0.97, eased),
        tx: lerp(-14, 14, storyProgress),
        ty: 0,
        focalX,
        focalY,
      };
    case 'dramatic_push':
      return {
        scale: lerp(baseScale * 0.96, baseScale * 1.12, eased),
        tx: lerp(16, -16, storyProgress),
        ty: 0,
        focalX,
        focalY,
      };
    case 'static':
    default:
      return { scale: baseScale, tx: 0, ty: 0, focalX, focalY };
  }
}

function drawPalmTree(
  ctx: CanvasRenderingContext2D,
  baseX: number,
  baseY: number,
  height: number,
  leanX: number,
  localFrame: number,
  scale = 1
) {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.scale(scale, scale);

  const breeze = Math.sin(localFrame * 0.08) * 6;
  const topX = leanX + breeze * 0.6;
  const topY = -height;

  ctx.strokeStyle = '#5C3A21';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(leanX * 0.35, -height * 0.5, topX, topY);
  ctx.stroke();

  ctx.strokeStyle = '#8B5A2B';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.quadraticCurveTo(leanX * 0.35 + 2, -height * 0.5, topX + 2, topY);
  ctx.stroke();

  const frondAngles = [-2.5, -1.9, -1.3, -0.5, 0.2, 0.7, 1.2];
  for (let i = 0; i < frondAngles.length; i++) {
    const angle = frondAngles[i] + Math.sin(localFrame * 0.08 + i * 0.7) * 0.06;
    const len = 85 + (i % 2) * 18;
    const endX = topX + Math.cos(angle) * len;
    const endY = topY + Math.sin(angle) * len + 22;
    const ctrlX = topX + Math.cos(angle) * (len * 0.55);
    const ctrlY = topY + Math.sin(angle) * (len * 0.35) - 14;

    ctx.fillStyle = i % 2 === 0 ? '#15803D' : '#166534';
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.quadraticCurveTo(ctrlX, ctrlY + 14, topX, topY + 4);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawIcedLimeGlass(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  tiltRadians: number,
  localFrame: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tiltRadians);
  ctx.scale(scale, scale);

  const gw = 28;
  const gh = 54;

  // Glass outer body
  ctx.fillStyle = 'rgba(224, 242, 254, 0.38)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-gw / 2, -gh / 2);
  ctx.lineTo(gw / 2, -gh / 2);
  ctx.lineTo(gw * 0.42, gh / 2);
  ctx.lineTo(-gw * 0.42, gh / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Golden iced drink liquid inside
  const liqGrad = ctx.createLinearGradient(0, -gh * 0.35, 0, gh * 0.46);
  liqGrad.addColorStop(0, 'rgba(251, 191, 36, 0.88)');
  liqGrad.addColorStop(1, 'rgba(217, 119, 6, 0.94)');
  ctx.fillStyle = liqGrad;
  ctx.beginPath();
  ctx.moveTo(-gw * 0.46, -gh * 0.32);
  ctx.lineTo(gw * 0.46, -gh * 0.32);
  ctx.lineTo(gw * 0.39, gh * 0.45);
  ctx.lineTo(-gw * 0.39, gh * 0.45);
  ctx.closePath();
  ctx.fill();

  // Translucent ice cubes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillRect(-8, -gh * 0.24, 9, 9);
  ctx.fillRect(1, -gh * 0.14, 8, 8);
  ctx.fillRect(-5, -2, 9, 8);

  // Lime slice wheel on rim
  ctx.save();
  ctx.translate(gw * 0.45, -gh * 0.46);
  ctx.fillStyle = '#16A34A';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#BEF264';
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ECFCCB';
  ctx.lineWidth = 1;
  for (let a = 0; a < 6; a++) {
    const rad = (a * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(rad) * 7.5, Math.sin(rad) * 7.5);
    ctx.stroke();
  }
  ctx.restore();

  // Straw
  ctx.strokeStyle = '#F43F5E';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-4, gh * 0.3);
  ctx.lineTo(-9, -gh * 0.72);
  ctx.stroke();

  // Animated condensation droplets trickling down the glass
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  const drops = [
    { dx: -6, base: -12, speed: 0.45 },
    { dx: 5, base: -4, speed: 0.35 },
    { dx: -2, base: 6, speed: 0.5 },
    { dx: 7, base: -16, speed: 0.3 },
  ];
  for (let i = 0; i < drops.length; i++) {
    const d = drops[i];
    const dropY = ((d.base + localFrame * d.speed + 20) % (gh * 0.75)) - gh * 0.3;
    ctx.beginPath();
    ctx.arc(d.dx, dropY, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Glass specular highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-gw * 0.35, -gh * 0.38);
  ctx.lineTo(-gw * 0.3, gh * 0.38);
  ctx.stroke();

  ctx.restore();
}

function drawTropicalBeachBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  groundY: number,
  localFrame: number,
  midShiftX: number
) {
  const oceanTop = height * 0.54;
  const shoreLineY = groundY - 14;

  const sunX = width * 0.68 - midShiftX * 0.3;
  const sunY = oceanTop - 12;

  const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 180);
  sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
  sunGlow.addColorStop(0.35, 'rgba(251, 146, 60, 0.45)');
  sunGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 42, 0, Math.PI * 2);
  ctx.fill();

  const seaGrad = ctx.createLinearGradient(0, oceanTop, 0, shoreLineY);
  seaGrad.addColorStop(0, '#0F766E');
  seaGrad.addColorStop(0.5, '#14B8A6');
  seaGrad.addColorStop(1, '#2DD4BF');
  ctx.fillStyle = seaGrad;
  ctx.fillRect(-200, oceanTop, width + 400, shoreLineY - oceanTop + 18);

  ctx.fillStyle = 'rgba(253, 224, 71, 0.45)';
  for (let i = 0; i < 8; i++) {
    const ry = oceanTop + 10 + i * ((shoreLineY - oceanTop - 16) / 8);
    const rw = 36 + i * 14 + Math.sin(localFrame * 0.12 + i) * 8;
    ctx.beginPath();
    ctx.ellipse(sunX, ry, rw, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let w = 0; w < 3; w++) {
    const waveCycle = (localFrame * 0.025 + w * 0.33) % 1;
    const waveY = lerp(oceanTop + 28, shoreLineY + 8, waveCycle);
    const foamAlpha = Math.sin(waveCycle * Math.PI) * 0.75;

    ctx.strokeStyle = `rgba(240, 253, 250, ${foamAlpha.toFixed(2)})`;
    ctx.lineWidth = 3 + waveCycle * 3;
    ctx.beginPath();
    for (let x = -120; x <= width + 120; x += 40) {
      const wy = waveY + Math.sin(x * 0.015 + w * 2 + localFrame * 0.06) * 4;
      if (x === -120) ctx.moveTo(x, wy);
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }

  const sandGrad = ctx.createLinearGradient(0, shoreLineY, 0, height + 80);
  sandGrad.addColorStop(0, '#FDE68A');
  sandGrad.addColorStop(0.35, '#FEF3C7');
  sandGrad.addColorStop(1, '#F59E0B');
  ctx.fillStyle = sandGrad;
  ctx.beginPath();
  ctx.moveTo(-200, shoreLineY + 6);
  ctx.quadraticCurveTo(width * 0.45, shoreLineY - 6, width + 200, shoreLineY + 12);
  ctx.lineTo(width + 200, height + 100);
  ctx.lineTo(-200, height + 100);
  ctx.closePath();
  ctx.fill();

  drawPalmTree(ctx, 140 - midShiftX, groundY + 10, 310, 65, localFrame, 1.05);
  drawPalmTree(ctx, width - 130 - midShiftX, groundY + 18, 280, -55, localFrame + 12, 0.95);

  ctx.save();
  const flarePositions = [
    { t: 0.25, r: 22, color: 'rgba(253, 224, 71, 0.14)' },
    { t: 0.48, r: 44, color: 'rgba(251, 146, 60, 0.10)' },
    { t: 0.72, r: 18, color: 'rgba(56, 189, 248, 0.12)' },
  ];
  for (const fp of flarePositions) {
    const fx = lerp(sunX, width * 0.25, fp.t);
    const fy = lerp(sunY, height * 0.75, fp.t);
    ctx.fillStyle = fp.color;
    ctx.beginPath();
    ctx.arc(fx, fy, fp.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCloseUpDrinkShot(
  ctx: CanvasRenderingContext2D,
  scene: SceneSpec,
  character: CharacterSpec | undefined,
  localFrame: number,
  sceneProgress: number,
  width: number,
  height: number
) {
  const groundY = height * STAGE_GROUND_RATIO;
  const palette = getSkyPalette(scene.environmentTheme, scene.timeOfDay);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, palette.top);
  skyGrad.addColorStop(0.55, palette.mid);
  skyGrad.addColorStop(1, palette.bottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Keep the continuous tropical beach backdrop visible behind a soft shallow-DOF veil
  drawTropicalBeachBackdrop(ctx, width, height, groundY, localFrame, 0);
  ctx.fillStyle = 'rgba(124, 45, 18, 0.22)';
  ctx.fillRect(0, 0, width, height);

  const bokehs = [
    { x: 0.72, y: 0.32, r: 78, c: 'rgba(254, 240, 138, 0.28)' },
    { x: 0.64, y: 0.42, r: 52, c: 'rgba(253, 186, 116, 0.24)' },
    { x: 0.82, y: 0.48, r: 64, c: 'rgba(45, 212, 191, 0.22)' },
    { x: 0.25, y: 0.28, r: 58, c: 'rgba(254, 215, 170, 0.18)' },
    { x: 0.52, y: 0.56, r: 44, c: 'rgba(254, 249, 195, 0.25)' },
  ];
  for (let i = 0; i < bokehs.length; i++) {
    const b = bokehs[i];
    const bx = width * b.x + Math.sin(localFrame * 0.04 + i) * 6;
    const by = height * b.y;
    ctx.fillStyle = b.c;
    ctx.beginPath();
    ctx.arc(bx, by, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPalmTree(ctx, width - 90, height * 0.85, 420, -90, localFrame, 1.3);

  const skinColor = character?.skinOrFurColor || '#E5B887';
  const shirtColor = character?.primaryColor || '#F8FAFC';
  const hairColor = character?.hairColor || '#292524';

  const liftCurve = Math.sin(clamp(sceneProgress, 0, 1) * Math.PI);
  const glassX = lerp(width * 0.54, width * 0.44, liftCurve);
  const glassY = lerp(height * 0.64, height * 0.45, liftCurve);
  const glassTilt = lerp(-0.05, -0.34, liftCurve);

  ctx.save();
  const headX = width * 0.27;
  const headY = height * 0.36;

  // Light linen shirt with open collar lapels and buttons
  ctx.fillStyle = shirtColor;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width * 0.04, height);
  ctx.quadraticCurveTo(width * 0.12, height * 0.52, width * 0.35, height * 0.56);
  ctx.lineTo(width * 0.42, height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Linen shirt collar detail
  ctx.beginPath();
  ctx.moveTo(headX - 36, headY + 115);
  ctx.lineTo(headX + 12, headY + 150);
  ctx.lineTo(headX + 38, headY + 118);
  ctx.stroke();

  // Neck & sculpted profile face
  ctx.fillStyle = skinColor;
  ctx.fillRect(headX - 28, headY + 58, 52, 74);
  ctx.beginPath();
  ctx.arc(headX, headY, 86, 0, Math.PI * 2);
  ctx.fill();

  // Sculpted nose profile & ear
  ctx.beginPath();
  ctx.moveTo(headX + 78, headY - 12);
  ctx.lineTo(headX + 96, headY + 8);
  ctx.lineTo(headX + 80, headY + 14);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(120, 53, 15, 0.35)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(headX - 24, headY + 6, 16, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();

  // Detailed Eye (sclera, iris, pupil, specular highlight, eyebrow)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(headX + 52, headY - 14, 13, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0284C7';
  ctx.beginPath();
  ctx.arc(headX + 55, headY - 13, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(headX + 56, headY - 13, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(headX + 54, headY - 15, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrow
  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(headX + 38, headY - 28);
  ctx.quadraticCurveTo(headX + 54, headY - 34, headX + 68, headY - 27);
  ctx.stroke();

  // Layered hair & breeze strands
  const hairBreeze = Math.sin(localFrame * 0.1) * 5;
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(headX - 14, headY - 18, 90, Math.PI * 0.82, Math.PI * 2.05);
  ctx.fill();

  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(headX + 20, headY - 82);
  ctx.quadraticCurveTo(headX + 55, headY - 95 + hairBreeze, headX + 82, headY - 78 + hairBreeze);
  ctx.stroke();

  // Sunglasses pushed up on forehead with lens shine
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(headX + 26, headY - 70, 44, 24, 6);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(headX + 34, headY - 64);
  ctx.lineTo(headX + 44, headY - 52);
  ctx.stroke();

  // Soft content smile / sipping lips
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  if (liftCurve > 0.55) {
    ctx.arc(headX + 68, headY + 28, 7, 0, Math.PI * 2);
  } else {
    ctx.arc(headX + 58, headY + 22, 16, 0.15, Math.PI * 0.65);
  }
  ctx.stroke();
  ctx.restore();

  // Forearm, wristwatch & sculpted hand lifting the tall iced drink glass
  ctx.save();
  ctx.strokeStyle = skinColor;
  ctx.lineWidth = 34;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(width * 0.28, height * 0.88);
  ctx.quadraticCurveTo(width * 0.38, height * 0.78, glassX - 18, glassY + 12);
  ctx.stroke();

  // Hero macro iced drink glass with lime slice & dripping condensation
  drawIcedLimeGlass(ctx, glassX, glassY, 3.1, glassTilt, localFrame);

  // Sculpted fingers wrapped around the glass
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = 'rgba(120, 53, 15, 0.28)';
  ctx.lineWidth = 1.5;
  for (let f = 0; f < 4; f++) {
    ctx.beginPath();
    ctx.roundRect(glassX - 46, glassY - 14 + f * 16, 34, 12, 6);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawOverShoulderBeachShot(
  ctx: CanvasRenderingContext2D,
  scene: SceneSpec,
  character: CharacterSpec | undefined,
  localFrame: number,
  sceneProgress: number,
  width: number,
  height: number
) {
  const groundY = height * STAGE_GROUND_RATIO;
  const palette = getSkyPalette(scene.environmentTheme, scene.timeOfDay);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, palette.top);
  skyGrad.addColorStop(0.55, palette.mid);
  skyGrad.addColorStop(1, palette.bottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  drawTropicalBeachBackdrop(ctx, width, height, groundY, localFrame, 0);

  const shirtColor = character?.primaryColor || '#F8FAFC';
  const skinColor = character?.skinOrFurColor || '#E5B887';
  const hairColor = character?.hairColor || '#292524';
  const breeze = Math.sin(localFrame * 0.09) * 7;

  ctx.save();
  // Wooden lounger headrest in lower left
  ctx.fillStyle = '#92400E';
  ctx.strokeStyle = '#451A03';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width * 0.04, height);
  ctx.lineTo(width * 0.16, height * 0.62);
  ctx.lineTo(width * 0.42, height * 0.68);
  ctx.lineTo(width * 0.34, height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Light linen shirt shoulder, collar & fabric seams
  ctx.fillStyle = shirtColor;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(width * 0.06, height);
  ctx.quadraticCurveTo(width * 0.14, height * 0.64, width * 0.28, height * 0.62);
  ctx.quadraticCurveTo(width * 0.42, height * 0.64, width * 0.46, height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const headX = width * 0.27;
  const headY = height * 0.46;
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(headX + 10, headY + 4, 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(headX, headY, 62, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  for (let s = 0; s < 3; s++) {
    ctx.beginPath();
    ctx.moveTo(headX + 32, headY - 24 + s * 16);
    ctx.quadraticCurveTo(
      headX + 64,
      headY - 20 + s * 16 + breeze,
      headX + 86,
      headY - 8 + s * 16 + breeze * 1.3
    );
    ctx.stroke();
  }

  // Sunglasses pushed up on head
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(headX + 18, headY - 52, 46, 18, 5);
  ctx.fill();
  ctx.stroke();

  drawIcedLimeGlass(ctx, width * 0.48, height * 0.78, 1.35, 0.04, localFrame);
  ctx.restore();

  if (sceneProgress > 0.72) {
    const fadeAlpha = clamp((sceneProgress - 0.72) / 0.28, 0, 0.85);
    ctx.fillStyle = `rgba(9, 13, 22, ${fadeAlpha.toFixed(2)})`;
    ctx.fillRect(0, 0, width, height);
  }
}

const GUMMY_COLORS = ['#F472B6', '#FBBF24', '#34D399', '#38BDF8', '#A78BFA', '#FB923C'];

function drawGlassCandyJar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  candyType: 'gummies' | 'lollipops' | 'chocolates',
  accentColor: string
) {
  ctx.save();
  ctx.translate(x, y);

  // Jar glass body
  ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
  ctx.strokeStyle = 'rgba(203, 213, 225, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h, w, h, 8);
  ctx.fill();
  ctx.stroke();

  // Candies inside jar
  if (candyType === 'gummies') {
    const cols = Math.max(3, Math.floor(w / 10));
    const rows = Math.max(3, Math.floor((h * 0.72) / 9));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gx = -w * 0.36 + (c / Math.max(1, cols - 1)) * (w * 0.72) + ((r % 2) * 2 - 1);
        const gy = -8 - r * 8.5;
        ctx.fillStyle = GUMMY_COLORS[(r * 3 + c) % GUMMY_COLORS.length];
        ctx.beginPath();
        ctx.arc(gx, gy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (candyType === 'lollipops') {
    for (let i = -2; i <= 2; i++) {
      const lx = i * (w * 0.16);
      const ly = -h * 0.58 - Math.abs(i) * 4;
      ctx.strokeStyle = '#F8FAFC';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, -6);
      ctx.lineTo(lx, ly);
      ctx.stroke();

      ctx.fillStyle = GUMMY_COLORS[(i + 4) % GUMMY_COLORS.length];
      ctx.beginPath();
      ctx.arc(lx, ly, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(lx, ly, 3.8, 0, Math.PI * 1.4);
      ctx.stroke();
    }
  } else {
    // Chocolates
    const cols = Math.max(3, Math.floor(w / 11));
    const rows = Math.max(3, Math.floor((h * 0.65) / 9));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = -w * 0.35 + (c / Math.max(1, cols - 1)) * (w * 0.7);
        const cy = -8 - r * 8.5;
        ctx.fillStyle = (r + c) % 2 === 0 ? '#78350F' : '#92400E';
        ctx.beginPath();
        ctx.roundRect(cx - 4.5, cy - 4, 9, 7, 3);
        ctx.fill();
      }
    }
  }

  // Jar neck & pastel dome lid
  ctx.fillStyle = accentColor;
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-w * 0.38, -h - 6, w * 0.76, 7, 3);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -h - 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glass specular highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w * 0.34, -h + 8);
  ctx.lineTo(-w * 0.34, -10);
  ctx.stroke();

  ctx.restore();
}

function drawPastelPaperBag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  fillRatio = 0.8
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const bw = 38;
  const bh = 48;

  // rainbow gummies peeking out top of bag
  if (fillRatio > 0.2) {
    for (let i = 0; i < 6; i++) {
      const gx = -bw * 0.32 + i * (bw * 0.13);
      const gy = -bh + 3 + (i % 2) * 3;
      ctx.fillStyle = GUMMY_COLORS[i % GUMMY_COLORS.length];
      ctx.beginPath();
      ctx.arc(gx, gy, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Paper bag body (pastel pink & cream stripes)
  ctx.fillStyle = '#FCE7F3';
  ctx.strokeStyle = '#F472B6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-bw * 0.44, -bh);
  ctx.lineTo(bw * 0.44, -bh);
  ctx.lineTo(bw * 0.5, 0);
  ctx.lineTo(-bw * 0.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Vertical pastel stripes on bag
  ctx.fillStyle = 'rgba(244, 114, 182, 0.28)';
  for (let s = -2; s <= 2; s++) {
    ctx.fillRect(s * 7 - 2, -bh + 2, 4, bh - 3);
  }

  // Heart sticker on front of paper bag
  ctx.fillStyle = '#F43F5E';
  ctx.beginPath();
  ctx.arc(-3, -bh * 0.48, 4, 0, Math.PI * 2);
  ctx.arc(3, -bh * 0.48, 4, 0, Math.PI * 2);
  ctx.moveTo(-6.5, -bh * 0.46);
  ctx.lineTo(0, -bh * 0.30);
  ctx.lineTo(6.5, -bh * 0.46);
  ctx.fill();

  ctx.restore();
}

function drawCandyShopBackdrop(
  ctx: CanvasRenderingContext2D,
  scene: SceneSpec,
  width: number,
  height: number,
  groundY: number,
  localFrame: number,
  midShiftX: number
) {
  // 1. Pastel striped candy-shop wallpaper
  ctx.fillStyle = '#FDF2F8';
  ctx.fillRect(-200, 0, width + 400, groundY);

  ctx.fillStyle = 'rgba(251, 207, 232, 0.42)';
  for (let sx = -200; sx < width + 400; sx += 56) {
    ctx.fillRect(sx - midShiftX * 0.3, 0, 28, groundY);
  }

  // Wainscoting lower wall panel
  ctx.fillStyle = '#FEF3C7';
  ctx.fillRect(-200, groundY - 88, width + 400, 88);
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-200, groundY - 88);
  ctx.lineTo(width + 400, groundY - 88);
  ctx.stroke();

  // 2. Cozy Candy Shop Entrance Door on the Left with Striped Awning & Ringing Bell
  const doorX = 165 - midShiftX * 0.65;
  const doorW = 118;
  const doorH = 275;
  const isEnteringDoor = scene.characterPlacements.some((cp) => cp.action === 'enter_door');

  // Door frame & sunny street view outside
  ctx.fillStyle = '#BAE6FD';
  ctx.fillRect(doorX - doorW / 2, groundY - doorH, doorW, doorH);

  // Door leaf (swings open slightly when shopper enters in Shot 1)
  const swingFactor = isEnteringDoor ? 0.68 + Math.sin(Math.min(1, localFrame / 36) * Math.PI * 0.5) * 0.18 : 0.96;
  ctx.fillStyle = '#F472B6';
  ctx.strokeStyle = '#9D174D';
  ctx.lineWidth = 4;
  ctx.fillRect(doorX - doorW / 2, groundY - doorH, doorW * swingFactor, doorH);
  ctx.strokeRect(doorX - doorW / 2, groundY - doorH, doorW * swingFactor, doorH);

  // Glass window pane in door + "SWEET SHOP" sign
  ctx.fillStyle = 'rgba(224, 242, 254, 0.78)';
  ctx.fillRect(doorX - doorW / 2 + 14, groundY - doorH + 22, doorW * swingFactor - 28, 125);

  // Brass door handle
  ctx.fillStyle = '#FBBF24';
  ctx.beginPath();
  ctx.arc(doorX - doorW / 2 + doorW * swingFactor - 16, groundY - 125, 6, 0, Math.PI * 2);
  ctx.fill();

  // Pastel striped awning above door
  const awningY = groundY - doorH - 26;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#F472B6' : '#FEF3C7';
    ctx.beginPath();
    ctx.roundRect(doorX - doorW / 2 - 12 + i * 24, awningY, 24, 28, [0, 0, 12, 12]);
    ctx.fill();
  }

  // Small brass bell above the door (rings with chime arcs in Shot 1!)
  const bellX = doorX + doorW / 2 - 8;
  const bellY = groundY - doorH - 6;
  const bellSwing = isEnteringDoor ? Math.sin(localFrame * 0.65) * 0.38 : 0;

  ctx.save();
  ctx.translate(bellX, bellY);
  ctx.rotate(bellSwing);
  ctx.fillStyle = '#F59E0B';
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, 12);
  ctx.quadraticCurveTo(-8, -4, 0, -6);
  ctx.quadraticCurveTo(8, -4, 10, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#B45309';
  ctx.beginPath();
  ctx.arc(0, 14, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Animated ringing chime sound-waves around the door bell when Shopper enters
  if (isEnteringDoor && localFrame < 68) {
    const ringPulse = (localFrame % 16) / 16;
    ctx.save();
    ctx.strokeStyle = `rgba(245, 158, 11, ${(1 - ringPulse) * 0.85})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(bellX + 12, bellY + 4, 12 + ringPulse * 18, -0.7, 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bellX - 12, bellY + 4, 12 + ringPulse * 18, Math.PI - 0.7, Math.PI + 0.7);
    ctx.stroke();

    ctx.fillStyle = '#D97706';
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('♪ DING-A-LING! ♪', bellX - 36, bellY - 16 - ringPulse * 6);
    ctx.restore();
  }

  // 3. Wooden Shelves Filled with Glass Jars of Bright Candies, Lollipops, Gummy Bears & Chocolates
  const shelfLeft = 330 - midShiftX * 0.55;
  const shelfW = 560;
  const shelfHeights = [groundY - 260, groundY - 180, groundY - 105];

  for (let s = 0; s < shelfHeights.length; s++) {
    const sy = shelfHeights[s];
    // Warm wooden shelf plank & brackets
    ctx.fillStyle = '#B45309';
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2;
    ctx.fillRect(shelfLeft, sy, shelfW, 12);
    ctx.strokeRect(shelfLeft, sy, shelfW, 12);

    // 6 glass candy jars per wooden shelf
    const jarCount = 6;
    for (let j = 0; j < jarCount; j++) {
      const jx = shelfLeft + 46 + j * 92;
      const types: ('gummies' | 'lollipops' | 'chocolates')[] = ['gummies', 'lollipops', 'chocolates'];
      const cType = types[(s + j) % 3];
      const lidColors = ['#F472B6', '#34D399', '#38BDF8', '#FBBF24', '#A78BFA'];
      drawGlassCandyJar(ctx, jx, sy, 44, 54, cType, lidColors[(s * 2 + j) % lidColors.length]);
    }
  }

  // 4. Warm Soft Pendant Lights Overhead
  const lampPositions = [260, 560, 880, 1120];
  for (let i = 0; i < lampPositions.length; i++) {
    const lx = lampPositions[i] - midShiftX * 0.35;
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, 54);
    ctx.stroke();

    // Warm soft light cone glow
    const glow = ctx.createRadialGradient(lx, 68, 8, lx, 110, 145);
    glow.addColorStop(0, 'rgba(254, 240, 138, 0.75)');
    glow.addColorStop(0.5, 'rgba(253, 230, 138, 0.22)');
    glow.addColorStop(1, 'rgba(253, 230, 138, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, 95, 145, 0, Math.PI * 2);
    ctx.fill();

    // Pastel dome shade
    ctx.fillStyle = i % 2 === 0 ? '#F472B6' : '#34D399';
    ctx.beginPath();
    ctx.arc(lx, 58, 22, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  }

  // 5. Warm Honey-Wood Candy Shop Floorboards
  const floorGrad = ctx.createLinearGradient(0, groundY, 0, height + 100);
  floorGrad.addColorStop(0, '#FDE68A');
  floorGrad.addColorStop(0.45, '#F59E0B');
  floorGrad.addColorStop(1, '#B45309');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(-300, groundY, width + 600, height - groundY + 200);

  ctx.strokeStyle = 'rgba(120, 53, 15, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-300, groundY);
  ctx.lineTo(width + 300, groundY);
  ctx.stroke();
}

function drawCandyCounterProp(
  ctx: CanvasRenderingContext2D,
  scene: SceneSpec,
  width: number,
  height: number,
  localFrame: number,
  sceneProgress: number
) {
  const groundY = height * STAGE_GROUND_RATIO;
  const counterX = width * 0.63;
  const counterW = 240;
  const counterH = 92;

  ctx.save();
  // Counter shadow
  ctx.fillStyle = 'rgba(120, 53, 15, 0.24)';
  ctx.beginPath();
  ctx.ellipse(counterX, groundY + 6, counterW * 0.54, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Counter wooden base with pastel mint & cream panels
  ctx.fillStyle = '#FFFBEB';
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(counterX - counterW / 2, groundY - counterH, counterW, counterH, 8);
  ctx.fill();
  ctx.stroke();

  // Pastel decorative front panels
  ctx.fillStyle = '#A7F3D0';
  ctx.fillRect(counterX - counterW / 2 + 14, groundY - counterH + 16, 96, counterH - 28);
  ctx.fillStyle = '#FBCFE8';
  ctx.fillRect(counterX + 10, groundY - counterH + 16, 96, counterH - 28);

  // Polished wood countertop
  ctx.fillStyle = '#92400E';
  ctx.beginPath();
  ctx.roundRect(counterX - counterW / 2 - 8, groundY - counterH - 10, counterW + 16, 12, 4);
  ctx.fill();

  // Candy Jar on Right Edge of Counter
  drawGlassCandyJar(
    ctx,
    counterX + counterW * 0.34,
    groundY - counterH - 10,
    34,
    44,
    'lollipops',
    '#F472B6'
  );

  // Vintage Brass & Pastel Candy Scale on the Counter
  const scaleX = counterX - 24;
  const scaleBaseY = groundY - counterH - 10;

  // Scale body
  ctx.fillStyle = '#34D399';
  ctx.strokeStyle = '#065F46';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(scaleX - 22, scaleBaseY - 34, 44, 34, 6);
  ctx.fill();
  ctx.stroke();

  // Circular weight dial face
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(scaleX, scaleBaseY - 17, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Animated scale needle (rotates as bag is weighed!)
  const isWeighing = scene.characterPlacements.some((cp) => cp.action === 'weigh_and_hand');
  const needleAngle = isWeighing
    ? sceneProgress < 0.55
      ? lerp(-1.2, 0.85, Math.min(1, sceneProgress * 2.2)) + Math.sin(localFrame * 0.6) * 0.08
      : -1.1
    : 0.4;
  ctx.strokeStyle = '#EF4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(scaleX, scaleBaseY - 17);
  ctx.lineTo(
    scaleX + Math.cos(needleAngle - Math.PI / 2) * 9,
    scaleBaseY - 17 + Math.sin(needleAngle - Math.PI / 2) * 9
  );
  ctx.stroke();

  // Brass weighing pan on top of scale
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(scaleX, scaleBaseY - 34);
  ctx.lineTo(scaleX, scaleBaseY - 42);
  ctx.moveTo(scaleX - 24, scaleBaseY - 42);
  ctx.quadraticCurveTo(scaleX, scaleBaseY - 36, scaleX + 24, scaleBaseY - 42);
  ctx.stroke();

  // When weighing (first half of Shot 3), show the pastel paper bag of rainbow gummies on the scale!
  // In the second half of Shot 3 (sceneProgress >= 0.52), the bag lifts off the scale and is handed to the Shopper!
  if (!isWeighing || sceneProgress < 0.52) {
    drawPastelPaperBag(ctx, scaleX, scaleBaseY - 42, 0.72, 0.9);
  } else {
    // Animated handoff of the pastel paper bag from Shopkeeper across the counter to the Shopper!
    const handoffT = easeInOutCubic(clamp((sceneProgress - 0.52) / 0.42, 0, 1));
    const bagX = lerp(scaleX, counterX - 88, handoffT);
    const bagY = lerp(scaleBaseY - 48, scaleBaseY - 56, Math.sin(handoffT * Math.PI));
    drawPastelPaperBag(ctx, bagX, bagY, 0.78, 0.95);
  }

  ctx.restore();
}

function drawCloseUpScoopCandyShot(
  ctx: CanvasRenderingContext2D,
  scene: SceneSpec,
  character: CharacterSpec | undefined,
  localFrame: number,
  sceneProgress: number,
  width: number,
  height: number
) {
  // Shot 2 (3-6s): Close-up of their hand scooping colorful gummies from a glass jar into a paper bag.
  // Render the continuous candy shop backdrop first so the background doesn't suddenly disappear after Shot 1
  const groundY = height * STAGE_GROUND_RATIO;
  drawCandyShopBackdrop(ctx, scene, width, height, groundY, localFrame, 0);

  // Soft shallow depth-of-field pastel veil over the shop shelves
  ctx.fillStyle = 'rgba(253, 242, 248, 0.46)';
  ctx.fillRect(0, 0, width, height);

  // Soft bokeh pastel candy lights in background
  const bokehs = [
    { x: 0.2, y: 0.25, r: 64, c: 'rgba(244, 114, 182, 0.22)' },
    { x: 0.5, y: 0.2, r: 76, c: 'rgba(251, 191, 36, 0.24)' },
    { x: 0.8, y: 0.28, r: 68, c: 'rgba(52, 211, 153, 0.22)' },
    { x: 0.35, y: 0.42, r: 52, c: 'rgba(56, 189, 248, 0.20)' },
    { x: 0.68, y: 0.45, r: 58, c: 'rgba(167, 139, 250, 0.20)' },
  ];
  for (let i = 0; i < bokehs.length; i++) {
    const b = bokehs[i];
    ctx.fillStyle = b.c;
    ctx.beginPath();
    ctx.arc(width * b.x, height * b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wooden counter surface at bottom
  ctx.fillStyle = '#D97706';
  ctx.fillRect(0, height * 0.78, width, height * 0.22);
  ctx.fillStyle = '#92400E';
  ctx.fillRect(0, height * 0.78, width, 12);

  // 1. Large Open Glass Candy Jar on the Left filled with Rainbow Gummy Bears
  const jarX = width * 0.31;
  const jarBottomY = height * 0.79;
  const jarW = 220;
  const jarH = 270;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.9)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(jarX - jarW / 2, jarBottomY - jarH, jarW, jarH, 22);
  ctx.fill();
  ctx.stroke();

  // Mound of colorful rainbow gummy bears inside the glass jar
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const gx = jarX - 78 + c * 26 + (r % 2) * 8;
      const gy = jarBottomY - 24 - r * 26;
      const color = GUMMY_COLORS[(r * 3 + c) % GUMMY_COLORS.length];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(gx - 11, gy - 12, 22, 24, 8);
      ctx.fill();
      // Little gummy bear ears
      ctx.beginPath();
      ctx.arc(gx - 7, gy - 13, 4.5, 0, Math.PI * 2);
      ctx.arc(gx + 7, gy - 13, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // 2. Pastel Striped Paper Bag on the Right (filling up with rainbow gummies!)
  const bagX = width * 0.69;
  const bagBottomY = height * 0.80;
  drawPastelPaperBag(ctx, bagX, bagBottomY, 4.3, clamp(0.25 + sceneProgress * 0.75, 0.25, 1));

  // 3. Shopper's Hand & Silver Candy Scoop Choreography
  const skinColor = character?.skinOrFurColor || '#FDE68A';
  const sleeveColor = character?.primaryColor || '#F472B6';

  // Phase 1 (0 -> 0.45): Scoop lifts gummies up from the glass jar
  // Phase 2 (0.45 -> 1.0): Scoop travels over to the paper bag and tilts to pour rainbow gummies in!
  const scoopX =
    sceneProgress < 0.45
      ? lerp(jarX, jarX + 45, sceneProgress / 0.45)
      : lerp(jarX + 45, bagX - 28, easeInOutCubic((sceneProgress - 0.45) / 0.55));
  const scoopY =
    sceneProgress < 0.45
      ? lerp(jarBottomY - 140, jarBottomY - 310, easeInOutCubic(sceneProgress / 0.45))
      : lerp(jarBottomY - 310, bagBottomY - 255, easeInOutCubic((sceneProgress - 0.45) / 0.55));
  const scoopTilt =
    sceneProgress < 0.52 ? -0.15 : lerp(-0.15, 0.68, clamp((sceneProgress - 0.52) / 0.35, 0, 1));

  // Falling rainbow gummies tumbling from the silver scoop into the paper bag!
  if (sceneProgress >= 0.52) {
    const pourT = (sceneProgress - 0.52) / 0.48;
    for (let g = 0; g < 6; g++) {
      const dropProgress = (pourT * 2.2 + g * 0.18) % 1;
      const gx = scoopX + 48 + Math.sin(g * 2.1) * 14;
      const gy = lerp(scoopY + 12, bagBottomY - 195, dropProgress);
      ctx.fillStyle = GUMMY_COLORS[g % GUMMY_COLORS.length];
      ctx.beginPath();
      ctx.roundRect(gx - 10, gy - 11, 20, 22, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(gx - 6, gy - 12, 4, 0, Math.PI * 2);
      ctx.arc(gx + 6, gy - 12, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.save();
  ctx.translate(scoopX, scoopY);
  ctx.rotate(scoopTilt);

  // Forearm & Sleeve entering from upper left
  ctx.strokeStyle = sleeveColor;
  ctx.lineWidth = 48;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-240, -140);
  ctx.lineTo(-75, -28);
  ctx.stroke();

  // Sculpted hand gripping scoop handle
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-72, -32, 54, 42, 16);
  ctx.fill();
  ctx.stroke();

  // Shiny silver candy scoop handle & bowl
  ctx.fillStyle = '#E2E8F0';
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-24, -14, 34, 14, 5);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(6, -24);
  ctx.quadraticCurveTo(68, -28, 86, -4);
  ctx.quadraticCurveTo(68, 28, 6, 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rainbow gummies sitting inside the silver scoop
  if (sceneProgress < 0.85) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = GUMMY_COLORS[i % GUMMY_COLORS.length];
      ctx.beginPath();
      ctx.arc(28 + i * 12, -2 + (i % 2) * 5, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawCloseUpEatCandyShot(
  ctx: CanvasRenderingContext2D,
  scene: SceneSpec,
  character: CharacterSpec | undefined,
  localFrame: number,
  sceneProgress: number,
  width: number,
  height: number
) {
  // Shot 4 (10-15s): Close-up of the shopper taking a candy from the bag, popping it in their mouth, and smiling happily.
  const groundY = height * STAGE_GROUND_RATIO;
  drawCandyShopBackdrop(ctx, scene, width, height, groundY, localFrame, 0);

  // Soft shallow depth-of-field pastel veil so the candy shop remains continuously visible behind the shopper
  ctx.fillStyle = 'rgba(253, 242, 248, 0.46)';
  ctx.fillRect(0, 0, width, height);

  // Soft pastel bokeh background
  const bokehs = [
    { x: 0.18, y: 0.28, r: 72, c: 'rgba(244, 114, 182, 0.25)' },
    { x: 0.82, y: 0.24, r: 84, c: 'rgba(251, 191, 36, 0.26)' },
    { x: 0.76, y: 0.62, r: 64, c: 'rgba(52, 211, 153, 0.22)' },
    { x: 0.24, y: 0.68, r: 58, c: 'rgba(56, 189, 248, 0.22)' },
  ];
  for (let i = 0; i < bokehs.length; i++) {
    const b = bokehs[i];
    ctx.fillStyle = b.c;
    ctx.beginPath();
    ctx.arc(width * b.x + Math.sin(localFrame * 0.05 + i) * 6, height * b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const skinColor = character?.skinOrFurColor || '#FDE68A';
  const shirtColor = character?.primaryColor || '#F472B6';
  const hairColor = character?.hairColor || '#451A03';

  const headX = width * 0.46;
  const headY = height * 0.42;

  ctx.save();
  // Torso / Shoulders in cheerful pastel top
  ctx.fillStyle = shirtColor;
  ctx.strokeStyle = '#9D174D';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(headX - 155, headY + 110, 310, 240, 60);
  ctx.fill();
  ctx.stroke();

  // Neck & Head
  ctx.fillStyle = skinColor;
  ctx.fillRect(headX - 28, headY + 72, 56, 54);
  ctx.beginPath();
  ctx.arc(headX, headY, 96, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Hair framing face
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(headX, headY - 12, 102, Math.PI * 0.88, Math.PI * 2.12);
  ctx.fill();

  // Expressive Eyes (delighted happy arcs after popping candy in mouth!)
  const hasEatenCandy = sceneProgress >= 0.56;
  if (hasEatenCandy) {
    // Joyful happy curved eyes
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(headX - 34, headY - 8, 16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headX + 34, headY - 8, 16, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    // Bright open eyes looking at the rainbow gummy
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(headX - 34, headY - 10, 14, 15, 0, 0, Math.PI * 2);
    ctx.ellipse(headX + 34, headY - 10, 14, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.arc(headX - 32, headY - 8, 8, 0, Math.PI * 2);
    ctx.arc(headX + 32, headY - 8, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(headX - 32, headY - 8, 4, 0, Math.PI * 2);
    ctx.arc(headX + 32, headY - 8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(headX - 35, headY - 12, 2.5, 0, Math.PI * 2);
    ctx.arc(headX + 29, headY - 12, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rosy happy cheeks
  ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
  ctx.beginPath();
  ctx.ellipse(headX - 54, headY + 18, 18, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(headX + 54, headY + 18, 18, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mouth: opens as candy approaches (0.35..0.55), then beams with a big delighted smile!
  const mouthY = headY + 38;
  if (sceneProgress > 0.32 && sceneProgress < 0.56) {
    ctx.fillStyle = '#991B1B';
    ctx.beginPath();
    ctx.ellipse(headX, mouthY, 18, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#FB7185';
    ctx.strokeStyle = '#881337';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(headX, mouthY - 6, 28, 0.1, Math.PI - 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Left hand holding the pastel paper candy bag at chest level
  const bagHoldX = headX - 95;
  const bagHoldY = height * 0.84;
  drawPastelPaperBag(ctx, bagHoldX, bagHoldY, 2.6, 0.9);

  // Right hand lifting a rainbow gummy from the bag and popping it into their mouth!
  const liftT = easeInOutCubic(clamp(sceneProgress / 0.52, 0, 1));
  const handX =
    sceneProgress < 0.56
      ? lerp(bagHoldX + 20, headX + 14, liftT)
      : lerp(headX + 14, headX + 85, easeInOutCubic((sceneProgress - 0.56) / 0.44));
  const handY =
    sceneProgress < 0.56
      ? lerp(bagHoldY - 110, mouthY + 6, liftT)
      : lerp(mouthY + 6, height * 0.74, easeInOutCubic((sceneProgress - 0.56) / 0.44));

  // Arm & Hand
  ctx.strokeStyle = skinColor;
  ctx.lineWidth = 28;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(headX + 135, height * 0.95);
  ctx.quadraticCurveTo(headX + 110, height * 0.78, handX, handY);
  ctx.stroke();

  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(handX, handY, 18, 0, Math.PI * 2);
  ctx.fill();

  // Rainbow gummy bear between fingers before popping into mouth
  if (sceneProgress < 0.54) {
    ctx.fillStyle = '#F472B6';
    ctx.strokeStyle = '#BE185D';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(handX - 11, handY - 24, 22, 24, 7);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(handX - 7, handY - 25, 4.5, 0, Math.PI * 2);
    ctx.arc(handX + 7, handY - 25, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Joyful sparkles around the smiling shopper after tasting the candy!
  if (hasEatenCandy) {
    const sparkleLocations = [
      { x: headX - 135, y: headY - 55 },
      { x: headX + 135, y: headY - 45 },
      { x: headX + 115, y: headY + 35 },
    ];
    ctx.fillStyle = '#FBBF24';
    for (let s = 0; s < sparkleLocations.length; s++) {
      const sp = sparkleLocations[s];
      const pulse = 8 + Math.sin(localFrame * 0.35 + s) * 4;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y - pulse);
      ctx.lineTo(sp.x + 4, sp.y - 4);
      ctx.lineTo(sp.x + pulse, sp.y);
      ctx.lineTo(sp.x + 4, sp.y + 4);
      ctx.lineTo(sp.x, sp.y + pulse);
      ctx.lineTo(sp.x - 4, sp.y + 4);
      ctx.lineTo(sp.x - pulse, sp.y);
      ctx.lineTo(sp.x - 4, sp.y - 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawEnvironment(
  ctx: CanvasRenderingContext2D,
  scene: SceneSpec,
  width: number,
  height: number,
  localFrame: number,
  cam: { scale: number; tx: number; ty: number; focalX: number; focalY: number }
) {
  const palette = getSkyPalette(scene.environmentTheme, scene.timeOfDay);
  const groundY = height * STAGE_GROUND_RATIO;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, palette.top);
  skyGrad.addColorStop(0.55, palette.mid);
  skyGrad.addColorStop(1, palette.bottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  const skyShiftX = -cam.tx * 0.15;
  const midShiftX = -cam.tx * 0.55;
  const fgShiftX = -cam.tx;

  if (scene.environmentTheme === 'tropical_beach') {
    ctx.save();
    ctx.translate(cam.focalX, cam.focalY);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-cam.focalX, -cam.focalY);
    drawTropicalBeachBackdrop(ctx, width, height, groundY, localFrame, midShiftX);
    ctx.restore();
    return;
  }

  if (scene.environmentTheme === 'candy_shop') {
    ctx.save();
    ctx.translate(cam.focalX, cam.focalY);
    ctx.scale(cam.scale, cam.scale);
    ctx.translate(-cam.focalX, -cam.focalY);
    drawCandyShopBackdrop(ctx, scene, width, height, groundY, localFrame, midShiftX);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.translate(skyShiftX, 0);
  const sunOrMoonY = scene.timeOfDay === 'day' ? height * 0.22 : height * 0.28;
  const sunOrMoonX = width * 0.76;
  const orbRadius = 46;

  const glowGrad = ctx.createRadialGradient(
    sunOrMoonX,
    sunOrMoonY,
    8,
    sunOrMoonX,
    sunOrMoonY,
    orbRadius * 2.4
  );
  if (scene.timeOfDay === 'night' || scene.environmentTheme === 'space_station') {
    glowGrad.addColorStop(0, 'rgba(224, 242, 254, 0.9)');
    glowGrad.addColorStop(0.4, 'rgba(56, 189, 248, 0.25)');
    glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  } else {
    glowGrad.addColorStop(0, 'rgba(254, 243, 199, 0.95)');
    glowGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.35)');
    glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
  }
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(sunOrMoonX, sunOrMoonY, orbRadius * 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle =
    scene.timeOfDay === 'night' || scene.environmentTheme === 'space_station'
      ? '#E0F2FE'
      : '#FEF3C7';
  ctx.beginPath();
  ctx.arc(sunOrMoonX, sunOrMoonY, orbRadius * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cam.focalX, cam.focalY);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.focalX, -cam.focalY);

  if (scene.environmentTheme === 'cyber_city') {
    const buildings = [
      { x: 40, w: 95, h: 250 },
      { x: 150, w: 120, h: 320 },
      { x: 290, w: 85, h: 210 },
      { x: 410, w: 140, h: 360 },
      { x: 580, w: 110, h: 280 },
      { x: 720, w: 130, h: 340 },
      { x: 880, w: 90, h: 240 },
      { x: 1000, w: 150, h: 310 },
      { x: 1170, w: 110, h: 260 },
    ];
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const bx = b.x - midShiftX;
      const by = groundY - b.h;
      ctx.fillStyle = i % 2 === 0 ? '#0F172A' : '#1E1B4B';
      ctx.fillRect(bx, by, b.w, b.h);
      ctx.strokeStyle = i % 2 === 0 ? '#38BDF8' : '#F472B6';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, b.w, b.h);

      const cols = 3;
      const rows = Math.floor(b.h / 32);
      for (let r = 1; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((i + r * 3 + c * 7) % 3 !== 0) {
            ctx.fillStyle = (i + c) % 2 === 0 ? 'rgba(56, 189, 248, 0.55)' : 'rgba(245, 158, 11, 0.55)';
            ctx.fillRect(bx + 14 + c * 26, by + r * 28, 14, 14);
          }
        }
      }
    }
  } else if (scene.environmentTheme === 'forest') {
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.moveTo(-200, groundY);
    ctx.lineTo(width * 0.25 - midShiftX * 0.5, groundY - 190);
    ctx.lineTo(width * 0.55 - midShiftX * 0.5, groundY - 110);
    ctx.lineTo(width * 0.85 - midShiftX * 0.5, groundY - 220);
    ctx.lineTo(width + 200, groundY);
    ctx.closePath();
    ctx.fill();

    const treePositions = [90, 230, 390, 560, 740, 910, 1080, 1210];
    for (let i = 0; i < treePositions.length; i++) {
      const tx = treePositions[i] - midShiftX;
      const treeH = 140 + (i % 3) * 35;
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(tx - 8, groundY - 45, 16, 45);

      ctx.fillStyle = i % 2 === 0 ? '#064E3B' : '#065F46';
      ctx.beginPath();
      ctx.moveTo(tx, groundY - treeH);
      ctx.lineTo(tx - 48, groundY - 38);
      ctx.lineTo(tx + 48, groundY - 38);
      ctx.closePath();
      ctx.fill();
    }
  } else if (scene.environmentTheme === 'space_station') {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    for (let x = -100; x < width + 200; x += 220) {
      const wx = x - midShiftX;
      ctx.strokeRect(wx + 20, 60, 180, groundY - 90);
    }
  } else if (scene.environmentTheme === 'sunset_desert') {
    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    ctx.moveTo(-200, groundY);
    ctx.lineTo(140 - midShiftX, groundY - 140);
    ctx.lineTo(340 - midShiftX, groundY - 140);
    ctx.lineTo(440 - midShiftX, groundY);
    ctx.lineTo(720 - midShiftX, groundY - 170);
    ctx.lineTo(960 - midShiftX, groundY - 170);
    ctx.lineTo(1090 - midShiftX, groundY);
    ctx.closePath();
    ctx.fill();
  } else if (scene.environmentTheme === 'ocean_cliff') {
    const seaGrad = ctx.createLinearGradient(0, groundY - 95, 0, groundY);
    seaGrad.addColorStop(0, '#0369A1');
    seaGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(-200, groundY - 95, width + 400, 95);
  }

  const groundGrad = ctx.createLinearGradient(0, groundY, 0, height + 100);
  groundGrad.addColorStop(0, palette.groundTop);
  groundGrad.addColorStop(1, palette.groundBottom);
  ctx.fillStyle = groundGrad;
  ctx.fillRect(-300, groundY, width + 600, height - groundY + 200);

  ctx.strokeStyle =
    scene.environmentTheme === 'cyber_city'
      ? '#38BDF8'
      : scene.environmentTheme === 'space_station'
      ? '#64748B'
      : 'rgba(248, 250, 252, 0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-300, groundY);
  ctx.lineTo(width + 300, groundY);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
  ctx.lineWidth = 1;
  for (let gx = -400; gx <= width + 400; gx += 120) {
    const topX = gx - fgShiftX;
    const bottomX = width / 2 + (topX - width / 2) * 1.85;
    ctx.beginPath();
    ctx.moveTo(topX, groundY);
    ctx.lineTo(bottomX, height + 100);
    ctx.stroke();
  }

  ctx.restore();
}

function drawForegroundProp(
  ctx: CanvasRenderingContext2D,
  scene: SceneSpec,
  width: number,
  height: number,
  localFrame: number,
  sceneProgress: number
) {
  const prop = scene.foregroundProp;
  if (prop === 'candy_counter' || scene.environmentTheme === 'candy_shop') {
    drawCandyCounterProp(ctx, scene, width, height, localFrame, sceneProgress);
    if (prop === 'candy_counter' || prop === 'candy_jars' || !prop || prop === 'none') {
      return;
    }
  }
  if (!prop || prop === 'none' || prop === 'beach_lounger') return;

  const groundY = height * STAGE_GROUND_RATIO;
  const cx = width * 0.5;

  ctx.save();
  if (prop === 'iced_drink') {
    ctx.fillStyle = '#78350F';
    ctx.fillRect(cx - 28, groundY - 46, 56, 8);
    ctx.fillRect(cx - 6, groundY - 38, 12, 38);
    drawIcedLimeGlass(ctx, cx, groundY - 72, 1.0, 0, localFrame);
  } else if (prop === 'monolith') {
    const hoverY = Math.sin(localFrame * 0.1) * 5;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, groundY + 4, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1E1B4B';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, groundY - 150 + hoverY);
    ctx.lineTo(cx + 32, groundY - 85 + hoverY);
    ctx.lineTo(cx, groundY - 20 + hoverY);
    ctx.lineTo(cx - 32, groundY - 85 + hoverY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (prop === 'ramen_cart') {
    const cartX = width * 0.52;
    ctx.fillStyle = '#451A03';
    ctx.fillRect(cartX - 75, groundY - 105, 150, 105);
    ctx.fillStyle = '#DC2626';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(cartX - 72 + i * 29, groundY - 105, 25, 26);
    }
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.arc(cartX - 50, groundY - 68, 11, 0, Math.PI * 2);
    ctx.arc(cartX + 50, groundY - 68, 11, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop === 'campfire') {
    ctx.fillStyle = '#78350F';
    ctx.fillRect(cx - 26, groundY - 8, 52, 8);
    const flicker = Math.sin(localFrame * 0.45) * 4;
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(cx - 18, groundY - 6);
    ctx.quadraticCurveTo(cx, groundY - 54 + flicker, cx + 18, groundY - 6);
    ctx.fill();
  } else if (prop === 'console_desk') {
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - 55, groundY - 56, 110, 56);
    ctx.strokeRect(cx - 55, groundY - 56, 110, 56);
  } else if (prop === 'telescope') {
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, groundY - 52);
    ctx.lineTo(cx - 22, groundY);
    ctx.moveTo(cx, groundY - 52);
    ctx.lineTo(cx + 22, groundY);
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, groundY - 54);
    ctx.rotate(-0.42);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-26, -7, 56, 14);
    ctx.restore();
  } else if (prop === 'lantern' || prop === 'crate') {
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.fillRect(cx - 24, groundY - 36, 48, 36);
    ctx.strokeRect(cx - 24, groundY - 36, 48, 36);
  }
  ctx.restore();
}

function drawLoungerAndCharacter(
  ctx: CanvasRenderingContext2D,
  character: CharacterSpec,
  placement: CharacterActionSpec,
  localFrame: number,
  sceneProgress: number,
  stageWidth: number,
  stageHeight: number,
  shotType: ShotType
) {
  const x = (placement.startX / 100) * stageWidth;
  const groundY = stageHeight * STAGE_GROUND_RATIO;
  const scale = shotType === 'wide' ? 0.82 : 1.08;
  const breeze = Math.sin(localFrame * 0.09) * 4.5;
  const hairColor = character.hairColor || '#292524';
  const skinColor = character.skinOrFurColor || '#E5B887';
  const shirtColor = character.primaryColor || '#F8FAFC';

  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(scale, scale);

  // Soft sand shadow under wooden lounger
  ctx.fillStyle = 'rgba(120, 53, 15, 0.28)';
  ctx.beginPath();
  ctx.ellipse(10, 8, 134, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wooden beach lounger frame (warm teak wood with slatted detail)
  ctx.strokeStyle = '#78350F';
  ctx.fillStyle = '#92400E';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Lounger legs & wheel
  ctx.beginPath();
  ctx.moveTo(-78, -20);
  ctx.lineTo(-92, 6);
  ctx.moveTo(82, -20);
  ctx.lineTo(94, 6);
  ctx.stroke();

  ctx.fillStyle = '#451A03';
  ctx.beginPath();
  ctx.arc(-92, 6, 5, 0, Math.PI * 2);
  ctx.fill();

  // Horizontal lounger bed slats
  ctx.beginPath();
  ctx.moveTo(-60, -22);
  ctx.lineTo(106, -22);
  ctx.stroke();

  // Angled wooden backrest
  ctx.beginPath();
  ctx.moveTo(-58, -22);
  ctx.lineTo(-104, -90);
  ctx.stroke();

  // Cream linen lounger cushion with stitched seam
  ctx.strokeStyle = '#FEF3C7';
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(-98, -84);
  ctx.lineTo(-55, -27);
  ctx.lineTo(100, -27);
  ctx.stroke();

  // Reclining character legs, rolled shorts & sandals on the lounger
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(-34, -35);
  ctx.lineTo(28, -43);
  ctx.stroke();

  ctx.strokeStyle = skinColor;
  ctx.lineWidth = 11.5;
  ctx.beginPath();
  ctx.moveTo(28, -43);
  ctx.lineTo(86, -34);
  ctx.stroke();

  // Leather beach sandals at feet
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(84, -44);
  ctx.lineTo(92, -26);
  ctx.stroke();

  // Reclining torso in light linen shirt with collar, buttons & pocket
  ctx.fillStyle = shirtColor;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-82, -84);
  ctx.lineTo(-40, -84);
  ctx.lineTo(-20, -32);
  ctx.lineTo(-58, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Linen shirt collar & button placket
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-62, -84);
  ctx.lineTo(-46, -64);
  ctx.lineTo(-34, -34);
  ctx.stroke();

  // Neck & Head resting comfortably
  const headX = -68;
  const headY = -108;
  ctx.fillStyle = skinColor;
  ctx.fillRect(headX - 6, headY + 14, 14, 14);
  ctx.beginPath();
  ctx.arc(headX, headY, 23, 0, Math.PI * 2);
  ctx.fill();

  // Sculpted nose & ear
  ctx.beginPath();
  ctx.moveTo(headX + 20, headY - 4);
  ctx.lineTo(headX + 26, headY + 2);
  ctx.lineTo(headX + 20, headY + 4);
  ctx.closePath();
  ctx.fill();

  // Layered hair with breeze-animated strands
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(headX - 4, headY - 4, 23.5, Math.PI * 0.72, Math.PI * 1.98);
  ctx.fill();

  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(headX - 18, headY - 14);
  ctx.quadraticCurveTo(headX - 38, headY - 12 + breeze, headX - 48, headY - 3 + breeze);
  ctx.moveTo(headX - 14, headY - 22);
  ctx.quadraticCurveTo(headX - 32, headY - 22 + breeze * 0.8, headX - 42, headY - 14 + breeze);
  ctx.stroke();

  // Sunglasses pushed up on head with gold rim & lens reflection
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(headX - 2, headY - 23, 19, 9.5, 3);
  ctx.fill();
  ctx.stroke();

  // Expressive Eye (sclera, iris, pupil, specular catchlight) & Eyebrow
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(headX + 10, headY - 3, 4.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0284C7';
  ctx.beginPath();
  ctx.arc(headX + 11, headY - 3, 2.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(headX + 11.5, headY - 3, 1.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(headX + 6, headY - 8);
  ctx.quadraticCurveTo(headX + 11, headY - 10, headX + 16, headY - 7);
  ctx.stroke();

  // Soft content smile watching the sea
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(headX + 9, headY + 5, 6, 0.1, Math.PI * 0.7);
  ctx.stroke();

  // Soft exhale breath wisp in Shot 3 (gaze_horizon)
  if (placement.action === 'gaze_horizon' && sceneProgress > 0.2 && sceneProgress < 0.75) {
    const exhaleProgress = (sceneProgress - 0.2) / 0.55;
    const exAlpha = Math.sin(exhaleProgress * Math.PI) * 0.45;
    ctx.strokeStyle = `rgba(255, 255, 255, ${exAlpha.toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(headX + 22, headY + 6);
    ctx.quadraticCurveTo(
      headX + 36 + exhaleProgress * 18,
      headY + 2 - exhaleProgress * 8,
      headX + 48 + exhaleProgress * 24,
      headY + 6 - exhaleProgress * 12
    );
    ctx.stroke();
  }

  // Arm & Iced Drink Glass Choreography
  let handX = -16;
  let handY = -64;
  let drinkTilt = 0;

  if (placement.action === 'sip_drink') {
    const sipT = Math.sin(clamp(sceneProgress, 0, 1) * Math.PI);
    handX = lerp(-16, headX + 24, sipT);
    handY = lerp(-62, headY + 6, sipT);
    drinkTilt = lerp(0, -0.35, sipT);
  } else if (placement.action === 'gaze_horizon') {
    const lowerT = easeInOutCubic(clamp(sceneProgress * 1.4, 0, 1));
    handX = lerp(headX + 22, -12, lowerT);
    handY = lerp(headY + 10, -58, lowerT);
    drinkTilt = lerp(-0.2, 0.02, lowerT);
  } else {
    handX = -14;
    handY = -62 + Math.sin(localFrame * 0.08) * 1.5;
  }

  // Rolled linen sleeve + forearm + hand
  ctx.strokeStyle = shirtColor;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-54, -72);
  ctx.lineTo(-40, -60);
  ctx.stroke();

  ctx.strokeStyle = skinColor;
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(-40, -60);
  ctx.quadraticCurveTo(-28, -54, handX, handY);
  ctx.stroke();

  // Tall glass of iced drink with lime slice & condensation
  drawIcedLimeGlass(ctx, handX + 6, handY - 8, 0.62, drinkTilt, localFrame);

  ctx.restore();
}

function drawSingleCharacter(
  ctx: CanvasRenderingContext2D,
  character: CharacterSpec,
  placement: CharacterActionSpec,
  localFrame: number,
  sceneProgress: number,
  isSpeaking: boolean,
  stageWidth: number,
  stageHeight: number,
  alpha = 1,
  shotType: ShotType = 'medium'
) {
  if (
    placement.action === 'relax_lounger' ||
    placement.action === 'sip_drink' ||
    placement.action === 'gaze_horizon'
  ) {
    drawLoungerAndCharacter(
      ctx,
      character,
      placement,
      localFrame,
      sceneProgress,
      stageWidth,
      stageHeight,
      shotType
    );
    return;
  }

  const isApproachingCounter =
    placement.action === 'weigh_and_hand' &&
    Math.abs(placement.endX - placement.startX) > 1 &&
    sceneProgress < 0.55;

  const moveProgress =
    placement.action === 'weigh_and_hand'
      ? easeInOutCubic(clamp(sceneProgress / 0.55, 0, 1))
      : easeInOutCubic(clamp(sceneProgress, 0, 1));

  const x = lerp(placement.startX, placement.endX, moveProgress) * (stageWidth / 100);
  const y = stageHeight * STAGE_GROUND_RATIO;

  const isMoving =
    ((placement.action === 'walk' ||
      placement.action === 'run' ||
      placement.action === 'enter_door') &&
      Math.abs(placement.endX - placement.startX) > 1) ||
    isApproachingCounter;
  const speedFreq = placement.action === 'run' ? 0.65 : 0.35;

  let bounceY = 0;
  if (isMoving) {
    bounceY = -Math.abs(Math.sin(localFrame * speedFreq)) * 7;
  } else if (placement.action === 'jump' || placement.action === 'celebrate') {
    bounceY = -Math.abs(Math.sin(localFrame * 0.3)) * 22;
  } else {
    bounceY = Math.sin(localFrame * 0.12) * 1.5;
  }

  const legSwing = isMoving ? Math.sin(localFrame * speedFreq) * 15 : 0;
  const dir = placement.facing === 'left' ? -1 : 1;
  const fixedScale =
    character.bodyType === 'animal_fox' ||
    character.bodyType === 'animal_cat' ||
    character.bodyType === 'spirit'
      ? 0.94
      : 1.04;

  const hairColor = character.hairColor || '#292524';
  const breeze = Math.sin(localFrame * 0.1) * 4;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(dir * fixedScale, fixedScale);

  // Ground Contact Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 30, 7.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, bounceY);

  // 1. Back Accessories & Tails (Cape, Backpack, Fox/Cat Tail)
  if (character.accessory === 'cape') {
    ctx.fillStyle = character.secondaryColor;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, -80);
    ctx.quadraticCurveTo(-38 - breeze, -45, -32 - breeze * 1.4, -12);
    ctx.lineTo(-8, -24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (character.accessory === 'backpack') {
    ctx.fillStyle = character.secondaryColor;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-28, -76, 14, 36, 5);
    ctx.fill();
    ctx.stroke();
  }

  if (character.bodyType === 'animal_fox') {
    const tailWag = Math.sin(localFrame * 0.18) * 6;
    ctx.fillStyle = character.skinOrFurColor;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-16, -38);
    ctx.quadraticCurveTo(-48, -56 + tailWag, -44, -28 + tailWag);
    ctx.quadraticCurveTo(-30, -18, -16, -32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (character.bodyType === 'animal_cat') {
    const tailWag = Math.sin(localFrame * 0.16) * 8;
    ctx.strokeStyle = character.skinOrFurColor;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-16, -36);
    ctx.quadraticCurveTo(-42, -48 + tailWag, -36, -68 + tailWag);
    ctx.stroke();
  }

  // 2. Articulated Legs & Footwear
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Back Leg
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-7, -34);
  ctx.lineTo(-7 - legSwing * 0.4, -18);
  ctx.lineTo(-8 - legSwing * 0.75, -4);
  ctx.stroke();

  // Back Shoe
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.roundRect(-13 - legSwing * 0.75, -6, 16, 7, 3);
  ctx.fill();

  // Front Leg
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 9.5;
  ctx.beginPath();
  ctx.moveTo(7, -34);
  ctx.lineTo(7 + legSwing * 0.4, -18);
  ctx.lineTo(8 + legSwing * 0.75, -4);
  ctx.stroke();

  // Front Shoe with accent sole
  ctx.fillStyle = character.secondaryColor;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(3 + legSwing * 0.75, -6, 17, 7, 3);
  ctx.fill();
  ctx.stroke();

  // 3. Detailed Torso, Collar, Belt & Jacket Seams
  ctx.fillStyle = character.primaryColor;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.roundRect(-21, -84, 42, 52, 12);
  ctx.fill();
  ctx.stroke();

  // Confectionery Apron for Shopkeeper
  const isShopkeeper =
    character.role.toLowerCase().includes('shopkeeper') ||
    character.name.toLowerCase().includes('shopkeeper');
  if (isShopkeeper) {
    ctx.fillStyle = '#FEF3C7';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-14, -76, 30, 42, 6);
    ctx.fill();
    ctx.stroke();
    // Apron pocket
    ctx.fillStyle = '#FBCFE8';
    ctx.fillRect(-6, -54, 16, 12);
  } else {
    // Belt / Waistband
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-20, -42, 40, 7);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-3, -42, 8, 7);
  }

  // Shirt Collar / Chest Detail
  if (character.bodyType === 'robot' || character.bodyType === 'astronaut') {
    ctx.fillStyle = character.secondaryColor;
    ctx.beginPath();
    ctx.roundRect(-10, -72, 22, 16, 4);
    ctx.fill();
  } else {
    ctx.strokeStyle = character.secondaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -83);
    ctx.lineTo(2, -70);
    ctx.lineTo(11, -83);
    ctx.stroke();
  }

  // Scarf Accessory (with breeze flutter)
  if (character.accessory === 'scarf') {
    ctx.fillStyle = character.secondaryColor;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-18, -88, 36, 10, 4);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-12, -80);
    ctx.quadraticCurveTo(-28 - breeze, -72, -26 - breeze * 1.2, -56);
    ctx.lineTo(-16 - breeze, -56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 4. Sculpted Head, Ears, Hair, Eyes, Eyebrows & Nose
  const headCenterY = -110;

  // Animal Ears (Fox / Cat) or Antenna
  if (character.bodyType === 'animal_fox' || character.bodyType === 'animal_cat') {
    ctx.fillStyle = character.skinOrFurColor;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    // Left Ear
    ctx.beginPath();
    ctx.moveTo(-16, headCenterY - 14);
    ctx.lineTo(-22, headCenterY - 36);
    ctx.lineTo(-4, headCenterY - 21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right Ear
    ctx.beginPath();
    ctx.moveTo(6, headCenterY - 21);
    ctx.lineTo(18, headCenterY - 36);
    ctx.lineTo(18, headCenterY - 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (character.bodyType === 'robot' || character.accessory === 'antenna') {
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, headCenterY - 23);
    ctx.lineTo(0, headCenterY - 38);
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(0, headCenterY - 40, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Head Base
  ctx.fillStyle = character.skinOrFurColor;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(0, headCenterY, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Humanoid Hair Volume & Bangs
  if (character.bodyType === 'humanoid') {
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(-2, headCenterY - 3, 24, Math.PI * 0.78, Math.PI * 1.98);
    ctx.fill();

    // Breeze hair strand
    ctx.strokeStyle = hairColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-18, headCenterY - 12);
    ctx.quadraticCurveTo(-30, headCenterY - 10 + breeze, -36, headCenterY - 2 + breeze);
    ctx.stroke();
  }

  // Ear detail on side of head
  if (character.bodyType === 'humanoid') {
    ctx.fillStyle = character.skinOrFurColor;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-10, headCenterY + 2, 5, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.stroke();
  }

  // Expressive Eyes (Sclera, Colored Iris, Pupil, Specular Highlight)
  const isBlinking = localFrame % 72 >= 69;
  if (isBlinking) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(2, headCenterY - 3, 7, 2.5);
    ctx.fillRect(12, headCenterY - 3, 7, 2.5);
  } else {
    // Sclera
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(5.5, headCenterY - 3, 4.2, 4.8, 0, 0, Math.PI * 2);
    ctx.ellipse(15.5, headCenterY - 3, 4.2, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris & Pupil
    ctx.fillStyle = character.secondaryColor;
    ctx.beginPath();
    ctx.arc(6.2, headCenterY - 3, 2.7, 0, Math.PI * 2);
    ctx.arc(16.2, headCenterY - 3, 2.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(6.6, headCenterY - 3, 1.5, 0, Math.PI * 2);
    ctx.arc(16.6, headCenterY - 3, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Specular Highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(5.4, headCenterY - 4.5, 1.1, 0, Math.PI * 2);
    ctx.arc(15.4, headCenterY - 4.5, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Expressive Eyebrows based on placement.expression
  ctx.strokeStyle = hairColor;
  ctx.lineWidth = 2.2;
  const browOffset =
    placement.expression === 'surprised' || placement.expression === 'excited'
      ? -3
      : placement.expression === 'determined'
      ? 1.5
      : 0;
  ctx.beginPath();
  ctx.moveTo(2, headCenterY - 9 + browOffset);
  ctx.lineTo(9, headCenterY - 10);
  ctx.moveTo(12, headCenterY - 10);
  ctx.lineTo(19, headCenterY - 9 + browOffset);
  ctx.stroke();

  // Nose & Whiskers
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(11, headCenterY - 1);
  ctx.lineTo(13.5, headCenterY + 2.5);
  ctx.lineTo(10.5, headCenterY + 3);
  ctx.stroke();

  if (character.bodyType === 'animal_cat' || character.bodyType === 'animal_fox') {
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-2, headCenterY + 3);
    ctx.lineTo(-10, headCenterY + 1);
    ctx.moveTo(-2, headCenterY + 6);
    ctx.lineTo(-10, headCenterY + 7);
    ctx.stroke();
  }

  // Mouth & Lip Sync
  const mouthY = headCenterY + 9;
  if (isSpeaking && Math.floor(localFrame / 2) % 2 === 0) {
    ctx.fillStyle = '#991B1B';
    ctx.beginPath();
    ctx.ellipse(10, mouthY, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(10, mouthY - 2, 5, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }

  // Head Accessories (Glasses, Crown, Headphones, Helmet)
  if (character.accessory === 'glasses') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(1, headCenterY - 7, 8.5, 7, 2);
    ctx.roundRect(11.5, headCenterY - 7, 8.5, 7, 2);
    ctx.fill();
    ctx.stroke();
  } else if (character.accessory === 'crown') {
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, headCenterY - 20);
    ctx.lineTo(-10, headCenterY - 34);
    ctx.lineTo(-3, headCenterY - 25);
    ctx.lineTo(2, headCenterY - 36);
    ctx.lineTo(7, headCenterY - 25);
    ctx.lineTo(14, headCenterY - 34);
    ctx.lineTo(14, headCenterY - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (character.accessory === 'headphones') {
    ctx.strokeStyle = character.secondaryColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(-1, headCenterY - 2, 25, Math.PI * 0.85, Math.PI * 1.95);
    ctx.stroke();
    ctx.fillStyle = character.secondaryColor;
    ctx.beginPath();
    ctx.roundRect(-16, headCenterY - 6, 9, 14, 4);
    ctx.fill();
  } else if (character.accessory === 'helmet' || character.bodyType === 'astronaut') {
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.8)';
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, headCenterY, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // 5. Articulated Arm & Hand
  ctx.strokeStyle = character.primaryColor;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(8, -74);
  let handX = 18 - legSwing * 0.6;
  let handY = -44;
  if (placement.action === 'wave' || placement.action === 'celebrate') {
    const waveOffset = Math.sin(localFrame * 0.45) * 14;
    handX = 28;
    handY = -98 + waveOffset;
  } else if (placement.action === 'think' || placement.action === 'inspect') {
    handX = 18;
    handY = headCenterY + 12;
  } else if (placement.action === 'weigh_and_hand') {
    if (isShopkeeper) {
      // Shopkeeper weighs bag on scale (first half) then extends hand with bag to Shopper (second half)
      const reachT = easeInOutCubic(clamp((sceneProgress - 0.45) / 0.45, 0, 1));
      handX = lerp(24, 38, reachT);
      handY = lerp(-68, -74, reachT);
    } else {
      // Shopper reaches out hand in second half to accept the weighed candy bag!
      const acceptT = easeInOutCubic(clamp((sceneProgress - 0.48) / 0.4, 0, 1));
      handX = lerp(18 - legSwing * 0.5, 34, acceptT);
      handY = lerp(-48, -72, acceptT);
    }
  } else if (placement.action === 'scoop_candy') {
    handX = 28;
    handY = -68 + Math.sin(localFrame * 0.25) * 6;
  } else if (placement.action === 'eat_candy') {
    handX = 16;
    handY = headCenterY + 10;
  }
  ctx.lineTo(handX, handY);
  ctx.stroke();

  // Sculpted Hand
  ctx.fillStyle = character.skinOrFurColor;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(handX, handY, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  dialogue: DialogueLineSpec,
  speakerPlacement: CharacterActionSpec | undefined,
  sceneProgress: number,
  stageWidth: number,
  stageHeight: number
) {
  if (!dialogue.text) return;

  const eased = easeInOutCubic(clamp(sceneProgress, 0, 1));
  const rawX = speakerPlacement
    ? lerp(speakerPlacement.startX, speakerPlacement.endX, eased) * (stageWidth / 100)
    : stageWidth * 0.5;
  const charY = stageHeight * STAGE_GROUND_RATIO;

  const bubbleW = Math.min(340, Math.max(180, dialogue.text.length * 7.2));
  const bubbleH = dialogue.text.length > 42 ? 66 : 48;
  const bx = clamp(rawX - bubbleW / 2, 24, stageWidth - bubbleW - 24);
  const by = Math.max(24, charY - 210);

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, bubbleW, bubbleH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#D97706';
  ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(dialogue.speakerName.toUpperCase(), bx + 14, by + 17);

  ctx.fillStyle = '#0F172A';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  const words = dialogue.text.split(' ');
  let line = '';
  let lineY = by + 34;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > bubbleW - 28 && i > 0) {
      ctx.fillText(line.trim(), bx + 14, lineY);
      line = words[i] + ' ';
      lineY += 17;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), bx + 14, lineY);
  ctx.restore();
}

function drawWeatherParticles(
  ctx: CanvasRenderingContext2D,
  effect: WeatherEffect,
  width: number,
  height: number,
  globalFrame: number
) {
  if (effect === 'clear') return;

  ctx.save();
  if (effect === 'rain') {
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 65; i++) {
      const rx = ((i * 97 + globalFrame * 14) % (width + 100)) - 50;
      const ry = (i * 53 + globalFrame * 28) % height;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8, ry + 18);
      ctx.stroke();
    }
  } else if (effect === 'snow') {
    ctx.fillStyle = 'rgba(248, 250, 252, 0.75)';
    for (let i = 0; i < 50; i++) {
      const sx = (i * 83 + Math.sin(globalFrame * 0.05 + i) * 25 + width) % width;
      const sy = (i * 47 + globalFrame * 4) % height;
      const r = 2 + (i % 3);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (effect === 'fireflies') {
    for (let i = 0; i < 28; i++) {
      const fx = (i * 113 + Math.sin(globalFrame * 0.04 + i) * 35 + width) % width;
      const fy = height * 0.3 + ((i * 61 + Math.cos(globalFrame * 0.05 + i) * 28) % (height * 0.55));
      const alpha = 0.35 + 0.55 * Math.abs(Math.sin(globalFrame * 0.08 + i));
      ctx.fillStyle = `rgba(250, 204, 21, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawRefractiveWaterDroplet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  stretchTeardrop = 0
) {
  ctx.save();
  ctx.translate(x, y);

  // Soft golden-hour outer aura / bloom around the translucent drop
  const aura = ctx.createRadialGradient(0, 0, Math.min(rx, ry) * 0.3, 0, 0, Math.max(rx, ry) * 2.1);
  aura.addColorStop(0, 'rgba(253, 224, 71, 0.32)');
  aura.addColorStop(0.55, 'rgba(245, 158, 11, 0.12)');
  aura.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(rx, ry) * 2.1, 0, Math.PI * 2);
  ctx.fill();

  // Droplet silhouette (either spherical or stretched teardrop while forming/falling)
  ctx.beginPath();
  if (stretchTeardrop > 0.05) {
    const tipY = -ry * (1 + stretchTeardrop * 0.85);
    ctx.moveTo(0, tipY);
    ctx.bezierCurveTo(rx * 0.95, -ry * 0.35, rx * 1.15, ry * 0.85, 0, ry);
    ctx.bezierCurveTo(-rx * 1.15, ry * 0.85, -rx * 0.95, -ry * 0.35, 0, tipY);
  } else {
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  }
  ctx.closePath();

  // Internal refractive water gradient (dark amber depth + golden sunset caustic + crystal rim)
  const bodyGrad = ctx.createRadialGradient(-rx * 0.28, -ry * 0.28, rx * 0.1, rx * 0.2, ry * 0.35, Math.max(rx, ry) * 1.25);
  bodyGrad.addColorStop(0, 'rgba(255, 251, 235, 0.92)');
  bodyGrad.addColorStop(0.28, 'rgba(253, 224, 71, 0.65)');
  bodyGrad.addColorStop(0.62, 'rgba(180, 83, 9, 0.48)');
  bodyGrad.addColorStop(0.88, 'rgba(30, 41, 59, 0.72)');
  bodyGrad.addColorStop(1, 'rgba(254, 243, 199, 0.88)');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Crisp refractive rim highlight
  ctx.strokeStyle = 'rgba(254, 249, 195, 0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Primary golden-hour specular catchlight (upper left)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.beginPath();
  ctx.ellipse(-rx * 0.34, -ry * 0.32, Math.max(2, rx * 0.24), Math.max(1.5, ry * 0.15), -0.45, 0, Math.PI * 2);
  ctx.fill();

  // Secondary internal caustic reflection arc (lower right)
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)';
  ctx.lineWidth = Math.max(1.5, rx * 0.1);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, Math.min(rx, ry) * 0.72, 0.25, 1.35);
  ctx.stroke();

  ctx.restore();
}

function drawWaterDropMacroScene(
  ctx: CanvasRenderingContext2D,
  scene: SceneSpec,
  localFrame: number,
  sceneProgress: number,
  width: number,
  height: number
) {
  const summaryLower = `${scene.title} ${scene.narrativeSummary}`.toLowerCase();
  const prop = scene.foregroundProp;

  // Determine which of the 4 macro water shots to render
  let phase: 'forming_falling' | 'crown_impact' | 'top_down_ripples' | 'stillness_fade' = 'forming_falling';
  if (
    prop === 'water_still' ||
    /\b(fade|returns to stillness|reflecting the soft sunset|shot 4)\b/.test(summaryLower)
  ) {
    phase = 'stillness_fade';
  } else if (
    prop === 'water_ripples' ||
    (/\b(top-down|spreading out|circular ripples|even rings|shot 3)\b/.test(summaryLower) &&
      !/\b(forming and falling|touches the surface)\b/.test(summaryLower))
  ) {
    phase = 'top_down_ripples';
  } else if (
    prop === 'water_crown' ||
    /\b(impact|touches the surface|splash|crown|bouncing back|shot 2)\b/.test(summaryLower)
  ) {
    phase = 'crown_impact';
  } else {
    phase = 'forming_falling';
  }

  // 1. Continuous golden-hour macro backdrop & water surface across all 4 shots
  // Instead of jumping to a completely different background after Shot 1, keep the horizon & golden bokeh unified!
  const waterSurfaceY =
    phase === 'top_down_ripples'
      ? height * 0.54
      : phase === 'stillness_fade'
      ? height * 0.58
      : height * 0.64;

  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#090D16');
  bgGrad.addColorStop(0.28, '#2A1208');
  bgGrad.addColorStop(0.52, '#7C2D12');
  bgGrad.addColorStop(0.64, '#D97706');
  bgGrad.addColorStop(0.78, '#451A03');
  bgGrad.addColorStop(1, '#090D16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft out-of-focus golden bokeh orbs in the background across all 4 shots
  const bokehOrbs = [
    { x: 0.16, y: 0.22, r: 68, a: 0.18, c: '251, 191, 36' },
    { x: 0.31, y: 0.36, r: 92, a: 0.24, c: '245, 158, 11' },
    { x: 0.52, y: 0.26, r: 115, a: 0.28, c: '253, 224, 71' },
    { x: 0.71, y: 0.34, r: 84, a: 0.22, c: '249, 115, 22' },
    { x: 0.85, y: 0.20, r: 62, a: 0.16, c: '254, 240, 138' },
    { x: 0.23, y: 0.48, r: 54, a: 0.18, c: '253, 224, 71' },
    { x: 0.78, y: 0.46, r: 74, a: 0.20, c: '245, 158, 11' },
  ];

  for (let i = 0; i < bokehOrbs.length; i++) {
    const b = bokehOrbs[i];
    const driftX = width * b.x + Math.sin(localFrame * 0.03 + i * 1.7) * 8;
    const driftY = height * b.y + Math.cos(localFrame * 0.025 + i * 1.3) * 5;
    const orbGrad = ctx.createRadialGradient(driftX, driftY, b.r * 0.1, driftX, driftY, b.r);
    orbGrad.addColorStop(0, `rgba(${b.c}, ${b.a})`);
    orbGrad.addColorStop(0.65, `rgba(${b.c}, ${b.a * 0.55})`);
    orbGrad.addColorStop(1, `rgba(${b.c}, 0)`);
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(driftX, driftY, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Continuous mirror water surface base across all 4 shots
  const waterGrad = ctx.createLinearGradient(0, waterSurfaceY, 0, height);
  waterGrad.addColorStop(0, 'rgba(251, 191, 36, 0.42)');
  waterGrad.addColorStop(0.22, 'rgba(180, 83, 9, 0.56)');
  waterGrad.addColorStop(0.58, 'rgba(28, 25, 23, 0.88)');
  waterGrad.addColorStop(1, '#05070B');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, waterSurfaceY, width, height - waterSurfaceY);

  // Golden-hour horizon specular reflection line across the water surface
  const surfaceGlow = ctx.createLinearGradient(0, waterSurfaceY - 5, 0, waterSurfaceY + 16);
  surfaceGlow.addColorStop(0, 'rgba(254, 243, 199, 0)');
  surfaceGlow.addColorStop(0.5, 'rgba(253, 224, 71, 0.68)');
  surfaceGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = surfaceGlow;
  ctx.fillRect(0, waterSurfaceY - 5, width, 21);

  const cx = width * 0.5;

  // =========================================================================
  // SHOT 1 (0–3s): Macro shot of a water drop slowly forming and falling
  // =========================================================================
  if (phase === 'forming_falling') {
    // Subtle camera zoom-in feel
    const zoom = lerp(1.0, 1.12, easeInOutCubic(sceneProgress));
    ctx.save();
    ctx.translate(cx, height * 0.45);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -height * 0.45);

    // Phase A (0.0 -> 0.38): Water drop slowly swells and stretches at top meniscus
    // Phase B (0.38 -> 1.0): Drop detaches and falls gracefully toward the mirror surface, catching golden light
    const detachT = 0.36;
    let dropY = 85;
    let rx = 28;
    let ry = 32;
    let stretch = 0;

    if (sceneProgress < detachT) {
      const formP = sceneProgress / detachT;
      dropY = lerp(64, 138, easeInOutCubic(formP));
      rx = lerp(18, 32, formP);
      ry = lerp(20, 42, formP);
      stretch = Math.sin(formP * Math.PI * 0.85) * 0.85;

      // Top meniscus / liquid thread clinging above the forming droplet
      ctx.fillStyle = 'rgba(253, 224, 71, 0.45)';
      ctx.beginPath();
      ctx.moveTo(cx - 28, 0);
      ctx.quadraticCurveTo(cx - 6, dropY * 0.55, cx, dropY - ry * 0.8);
      ctx.quadraticCurveTo(cx + 6, dropY * 0.55, cx + 28, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      const fallP = clamp((sceneProgress - detachT) / (1 - detachT), 0, 1);
      const accelP = fallP * fallP * 0.65 + fallP * 0.35;
      dropY = lerp(138, waterSurfaceY - 36, accelP);
      // Slight fluid oscillation while falling in super slow-motion
      const osc = Math.sin(localFrame * 0.45) * 2.5;
      rx = 33 + osc;
      ry = 39 - osc * 0.7;
      stretch = 0.38;

      // Tiny trailing micro-droplet above the main falling drop
      if (fallP < 0.75) {
        const trailY = lerp(82, dropY - 78, fallP);
        drawRefractiveWaterDroplet(ctx, cx, trailY, 9, 10, 0.1);
      }
    }

    // Mirror reflection of the falling drop on the still water surface below!
    const distToWater = Math.max(10, waterSurfaceY - dropY);
    const reflAlpha = clamp(1 - distToWater / (waterSurfaceY * 0.95), 0.15, 0.75);
    const reflY = waterSurfaceY + Math.min(height - waterSurfaceY - 24, distToWater * 0.42);
    ctx.save();
    ctx.globalAlpha = reflAlpha * 0.55;
    drawRefractiveWaterDroplet(ctx, cx, reflY, rx * 0.9, ry * 0.55, 0);
    ctx.restore();

    // Draw the primary crystal-clear falling water drop catching golden-hour light
    drawRefractiveWaterDroplet(ctx, cx, dropY, rx, ry, stretch);

    // Sparkling golden star-burst highlight on the droplet rim
    const starX = cx - rx * 0.36;
    const starY = dropY - ry * 0.3;
    const starSize = 14 + Math.sin(localFrame * 0.35) * 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(starX - starSize, starY);
    ctx.lineTo(starX + starSize, starY);
    ctx.moveTo(starX, starY - starSize);
    ctx.lineTo(starX, starY + starSize);
    ctx.stroke();

    ctx.restore();
    return;
  }

  // =========================================================================
  // SHOT 2 (3–5s): Super slow-motion impact, crown splash & rebound droplet
  // =========================================================================
  if (phase === 'crown_impact') {
    const impactY = waterSurfaceY + 18;

    // 1. Initial expanding impact rings around the splash crater
    const ringCount = 4;
    for (let r = 0; r < ringCount; r++) {
      const ringT = clamp(sceneProgress * 1.15 - r * 0.14, 0, 1);
      if (ringT <= 0) continue;
      const rx = lerp(34, 340, easeInOutCubic(ringT));
      const ry = rx * 0.24;
      const alpha = (1 - ringT * 0.75) * 0.85;

      ctx.strokeStyle = `rgba(253, 224, 71, ${alpha.toFixed(3)})`;
      ctx.lineWidth = lerp(4.5, 1.5, ringT);
      ctx.beginPath();
      ctx.ellipse(cx, impactY, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Crown-Shaped Splash Rim (peaks around sceneProgress 0.15..0.65)
    const crownEnv = Math.sin(clamp(sceneProgress / 0.82, 0, 1) * Math.PI);
    if (crownEnv > 0.04) {
      const crownBaseW = lerp(42, 118, Math.min(1, sceneProgress * 1.4));
      const crownTopW = crownBaseW * 1.28;
      const crownH = 96 * crownEnv;

      ctx.save();
      const crownGrad = ctx.createLinearGradient(cx, impactY - crownH, cx, impactY + 12);
      crownGrad.addColorStop(0, 'rgba(255, 251, 235, 0.92)');
      crownGrad.addColorStop(0.45, 'rgba(253, 224, 71, 0.68)');
      crownGrad.addColorStop(1, 'rgba(217, 119, 6, 0.35)');

      ctx.fillStyle = crownGrad;
      ctx.strokeStyle = 'rgba(254, 249, 195, 0.9)';
      ctx.lineWidth = 2;

      const spikes = 9;
      ctx.beginPath();
      ctx.moveTo(cx - crownBaseW, impactY);
      for (let s = 0; s < spikes; s++) {
        const tSpike = s / (spikes - 1);
        const sx = lerp(cx - crownTopW, cx + crownTopW, tSpike);
        const arch = 1 - Math.pow((tSpike - 0.5) * 1.6, 2);
        const sy = impactY - crownH * (0.72 + arch * 0.35);

        const nextT = (s + 0.5) / (spikes - 1);
        const valleyX = lerp(cx - crownTopW * 0.94, cx + crownTopW * 0.94, nextT);
        const valleyY = impactY - crownH * 0.42;

        ctx.lineTo(sx, sy);
        if (s < spikes - 1) {
          ctx.quadraticCurveTo((sx + valleyX) * 0.5, valleyY, valleyX, valleyY);
        }
      }
      ctx.lineTo(cx + crownBaseW, impactY);
      ctx.ellipse(cx, impactY, crownBaseW, crownBaseW * 0.18, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tiny satellite jewel droplets ejecting off each crown tip
      for (let s = 0; s < spikes; s++) {
        const tSpike = s / (spikes - 1);
        const angle = lerp(-Math.PI * 0.78, -Math.PI * 0.22, tSpike);
        const dist = crownH * 0.85 + sceneProgress * 64;
        const dx = cx + Math.cos(angle) * (crownTopW * 0.85 + sceneProgress * 32);
        const dy = impactY + Math.sin(angle) * dist + sceneProgress * sceneProgress * 42;
        drawRefractiveWaterDroplet(ctx, dx, dy, 5.5, 6.5, 0);
      }
      ctx.restore();
    }

    // 3. Central Rebound Droplet ("a small droplet bouncing back up" - Worthington jet)
    if (sceneProgress > 0.18) {
      const jetP = clamp((sceneProgress - 0.18) / 0.82, 0, 1);
      const bounceArc = Math.sin(jetP * Math.PI * 0.92);
      const jetHeight = 148 * bounceArc;

      // Rising liquid column beneath the bouncing droplet
      const colH = Math.max(0, jetHeight - 34) * (1 - jetP * 0.45);
      if (colH > 6) {
        const colGrad = ctx.createLinearGradient(cx, impactY - colH, cx, impactY + 8);
        colGrad.addColorStop(0, 'rgba(254, 243, 199, 0.85)');
        colGrad.addColorStop(1, 'rgba(245, 158, 11, 0.35)');
        ctx.fillStyle = colGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 18, impactY + 4);
        ctx.quadraticCurveTo(cx - 6, impactY - colH * 0.5, cx - 7, impactY - colH);
        ctx.arc(cx, impactY - colH, 7, Math.PI, 0);
        ctx.quadraticCurveTo(cx + 6, impactY - colH * 0.5, cx + 18, impactY + 4);
        ctx.closePath();
        ctx.fill();
      }

      // The bouncing primary droplet at the peak of the jet
      const reboundY = impactY - jetHeight - 16;
      drawRefractiveWaterDroplet(ctx, cx, reboundY, 21, 23, 0.12);
    }
    return;
  }

  // =========================================================================
  // SHOT 3 (5–8s): Elevated view of circular ripples spreading out evenly
  // =========================================================================
  if (phase === 'top_down_ripples') {
    const cy = waterSurfaceY + (height - waterSurfaceY) * 0.44;
    const tiltRatio = 0.48;

    // Warm golden-hour sunlight reflection pool across the calm water
    const sunPool = ctx.createRadialGradient(cx, cy, 12, cx, cy, width * 0.46);
    sunPool.addColorStop(0, 'rgba(253, 224, 71, 0.35)');
    sunPool.addColorStop(0.45, 'rgba(217, 119, 6, 0.22)');
    sunPool.addColorStop(1, 'rgba(12, 10, 9, 0)');
    ctx.fillStyle = sunPool;
    ctx.fillRect(0, waterSurfaceY, width, height - waterSurfaceY);

    // 7 concentric ripples spreading outward in even rings across the continuous water plane
    const numRings = 7;
    const maxRadius = width * 0.42;

    for (let i = 0; i < numRings; i++) {
      const ringProgress = (sceneProgress * 0.85 + i / numRings) % 1;
      const rx = lerp(22, maxRadius, ringProgress);
      const ry = rx * tiltRatio;
      const envAlpha = Math.sin(ringProgress * Math.PI) * 0.88;

      // Dark trough ring for realistic 3D wave depth
      ctx.strokeStyle = `rgba(9, 13, 22, ${(envAlpha * 0.65).toFixed(3)})`;
      ctx.lineWidth = lerp(12, 4, ringProgress);
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(4, rx - 4), Math.max(2, ry - 2), 0, 0, Math.PI * 2);
      ctx.stroke();

      // Golden-hour sunlit crest ring
      ctx.strokeStyle = `rgba(253, 224, 71, ${envAlpha.toFixed(3)})`;
      ctx.lineWidth = lerp(5.5, 1.6, ringProgress);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Crisp white-gold inner specular rim
      ctx.strokeStyle = `rgba(255, 251, 235, ${(envAlpha * 0.75).toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx + 1.5, ry + 0.8, 0, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();

      // Sparkling golden-hour highlights dancing along each ripple ring
      const sparkCount = 8;
      for (let k = 0; k < sparkCount; k++) {
        const angle = (k / sparkCount) * Math.PI * 2 + i * 0.45 + localFrame * 0.012;
        const sx = cx + Math.cos(angle) * rx;
        const sy = cy + Math.sin(angle) * ry;
        const twinkle = (Math.sin(localFrame * 0.28 + i * 2.1 + k * 1.7) + 1) * 0.5;
        if (twinkle > 0.35) {
          const spAlpha = envAlpha * twinkle;
          ctx.fillStyle = `rgba(255, 255, 255, ${spAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 2.5 + twinkle * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    return;
  }

  // =========================================================================
  // SHOT 4 (8–10s): Ripples fade & water returns to stillness reflecting sunset
  // =========================================================================
  {
    const dampFactor = Math.pow(1 - clamp(sceneProgress, 0, 1), 1.6);
    const cy = height * 0.74;

    // Glowing sunset orb & soft clouds reflected in the still water
    const sunX = width * 0.5;
    const sunSkyY = waterSurfaceY - 72;
    const sunReflY = waterSurfaceY + 72;

    // Sky sunset glow above horizon
    const skySun = ctx.createRadialGradient(sunX, sunSkyY, 10, sunX, sunSkyY, 190);
    skySun.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
    skySun.addColorStop(0.35, 'rgba(251, 191, 36, 0.55)');
    skySun.addColorStop(0.7, 'rgba(249, 115, 22, 0.22)');
    skySun.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = skySun;
    ctx.beginPath();
    ctx.arc(sunX, sunSkyY, 190, 0, Math.PI * 2);
    ctx.fill();

    // Mirror reflection of the sunset sky in the calming water
    const reflSun = ctx.createRadialGradient(sunX, sunReflY, 10, sunX, sunReflY, 210);
    reflSun.addColorStop(0, 'rgba(254, 249, 195, 0.78)');
    reflSun.addColorStop(0.4, 'rgba(251, 191, 36, 0.42)');
    reflSun.addColorStop(0.75, 'rgba(234, 88, 12, 0.18)');
    reflSun.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = reflSun;
    ctx.beginPath();
    ctx.arc(sunX, sunReflY, 210, 0, Math.PI * 2);
    ctx.fill();

    // Gently fading concentric ripples that dissolve into mirror stillness
    if (dampFactor > 0.02) {
      for (let r = 0; r < 5; r++) {
        const ringT = ((sceneProgress * 0.5 + r * 0.2) % 1);
        const rx = lerp(60, 460, ringT);
        const ry = rx * 0.18;
        const alpha = dampFactor * (1 - ringT) * 0.65;

        ctx.strokeStyle = `rgba(253, 224, 71, ${alpha.toFixed(3)})`;
        ctx.lineWidth = lerp(2.8, 0.8, ringT);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Horizontal golden mirror shimmer lines on the tranquil water
    for (let s = 0; s < 9; s++) {
      const sy = waterSurfaceY + 14 + s * 22;
      const sw = lerp(180, 65, s / 8) + Math.sin(localFrame * 0.05 + s) * 14 * dampFactor;
      const sAlpha = lerp(0.55, 0.15, s / 8);
      ctx.strokeStyle = `rgba(254, 243, 199, ${sAlpha.toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - sw, sy);
      ctx.lineTo(cx + sw, sy);
      ctx.stroke();
    }
  }
}

function renderSceneVisualLayer(
  ctx: CanvasRenderingContext2D,
  project: AnimationProject,
  scene: SceneSpec,
  sceneIndex: number,
  localFrame: number,
  sceneProgress: number,
  globalFrame: number,
  width: number,
  height: number
) {
  const shotType: ShotType = scene.shotType || 'medium';
  const activeDialogues = scene.dialogues.filter(
    (d) =>
      localFrame >= d.startFrameOffset &&
      localFrame <= d.startFrameOffset + d.durationFrames
  );

  // Macro Water Drop & Golden-Hour Ripples Sequence (Actor-Free Nature / Fluid Physics)
  if (
    scene.environmentTheme === 'water_drop_macro' ||
    ['water_drop', 'water_crown', 'water_ripples', 'water_still'].includes(
      scene.foregroundProp
    )
  ) {
    drawWaterDropMacroScene(
      ctx,
      scene,
      localFrame,
      sceneProgress,
      width,
      height
    );
    return activeDialogues;
  }

  // Candy Shop Close-Up Shot 2: Hand scooping colorful gummies from a glass jar into a paper bag
  if (
    shotType === 'close_up' &&
    (scene.characterPlacements.some((cp) => cp.action === 'scoop_candy') ||
      scene.foregroundProp === 'candy_jars')
  ) {
    drawCloseUpScoopCandyShot(
      ctx,
      scene,
      project.characters[0],
      localFrame,
      sceneProgress,
      width,
      height
    );
    return activeDialogues;
  }

  // Candy Shop Close-Up Shot 4: Shopper taking a candy from the bag, popping it in their mouth, and smiling happily
  if (
    shotType === 'close_up' &&
    (scene.characterPlacements.some((cp) => cp.action === 'eat_candy') ||
      scene.environmentTheme === 'candy_shop')
  ) {
    drawCloseUpEatCandyShot(
      ctx,
      scene,
      project.characters[0],
      localFrame,
      sceneProgress,
      width,
      height
    );
    return activeDialogues;
  }

  if (
    shotType === 'close_up' &&
    (scene.environmentTheme === 'tropical_beach' ||
      scene.foregroundProp === 'beach_lounger' ||
      scene.foregroundProp === 'iced_drink' ||
      scene.characterPlacements.some((cp) => cp.action === 'sip_drink'))
  ) {
    drawCloseUpDrinkShot(
      ctx,
      scene,
      project.characters[0],
      localFrame,
      sceneProgress,
      width,
      height
    );
    return activeDialogues;
  }

  if (
    shotType === 'over_shoulder' &&
    (scene.environmentTheme === 'tropical_beach' ||
      scene.characterPlacements.some(
        (cp) =>
          cp.action === 'gaze_horizon' ||
          cp.action === 'relax_lounger' ||
          cp.action === 'sip_drink'
      ))
  ) {
    drawOverShoulderBeachShot(
      ctx,
      scene,
      project.characters[0],
      localFrame,
      sceneProgress,
      width,
      height
    );
    return activeDialogues;
  }

  const cam = getCameraTransform(
    scene.cameraMotion,
    shotType,
    sceneProgress,
    width,
    height,
    sceneIndex,
    project.scenes.length
  );

  drawEnvironment(ctx, scene, width, height, localFrame, cam);

  ctx.save();
  ctx.translate(cam.focalX, cam.focalY);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.focalX - cam.tx, -cam.focalY - cam.ty);

  const speakingCharIds = new Set(activeDialogues.map((d) => d.characterId));
  const isCandyScene =
    scene.environmentTheme === 'candy_shop' || scene.foregroundProp === 'candy_counter';

  if (isCandyScene) {
    // Draw Shopkeeper first so they stand naturally behind the wooden candy counter!
    for (const placement of scene.characterPlacements) {
      const character =
        project.characters.find((c) => c.id === placement.characterId) ||
        project.characters[0];
      if (!character) continue;
      const isBehindCounter =
        character.role.toLowerCase().includes('shopkeeper') || placement.startX >= 60;
      if (isBehindCounter) {
        drawSingleCharacter(
          ctx,
          character,
          placement,
          localFrame,
          sceneProgress,
          speakingCharIds.has(character.id),
          width,
          height,
          1.0,
          shotType
        );
      }
    }

    // Draw Candy Counter & Scale
    drawForegroundProp(ctx, scene, width, height, localFrame, sceneProgress);

    // Draw Shopper in front of / approaching the counter
    for (const placement of scene.characterPlacements) {
      const character =
        project.characters.find((c) => c.id === placement.characterId) ||
        project.characters[0];
      if (!character) continue;
      const isBehindCounter =
        character.role.toLowerCase().includes('shopkeeper') || placement.startX >= 60;
      if (!isBehindCounter) {
        drawSingleCharacter(
          ctx,
          character,
          placement,
          localFrame,
          sceneProgress,
          speakingCharIds.has(character.id),
          width,
          height,
          1.0,
          shotType
        );
      }
    }
  } else {
    drawForegroundProp(ctx, scene, width, height, localFrame, sceneProgress);

    for (const placement of scene.characterPlacements) {
      const character =
        project.characters.find((c) => c.id === placement.characterId) ||
        project.characters[0];
      if (!character) continue;

      drawSingleCharacter(
        ctx,
        character,
        placement,
        localFrame,
        sceneProgress,
        speakingCharIds.has(character.id),
        width,
        height,
        1.0,
        shotType
      );
    }
  }

  for (const dlg of activeDialogues) {
    const speakerPlacement = scene.characterPlacements.find(
      (cp) => cp.characterId === dlg.characterId
    );
    drawSpeechBubble(
      ctx,
      dlg,
      speakerPlacement,
      sceneProgress,
      width,
      height
    );
  }

  ctx.restore();

  drawWeatherParticles(ctx, scene.weatherEffect, width, height, globalFrame);
  return activeDialogues;
}

function drawSafeGuidesAndHUD(
  ctx: CanvasRenderingContext2D,
  scene: SceneSpec,
  sceneIndex: number,
  globalFrame: number,
  activeDialogues: DialogueLineSpec[],
  options: RenderOptions,
  width: number,
  height: number
) {
  if (options.showSafeGuides) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);
    ctx.restore();
  }

  if (options.showSubtitles && activeDialogues.length > 0) {
    const latest = activeDialogues[activeDialogues.length - 1];
    const subText = `${latest.speakerName}: "${latest.text}"`;
    ctx.save();
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    const textW = ctx.measureText(subText).width;
    const boxW = Math.min(width - 80, textW + 36);
    const boxX = (width - boxW) / 2;
    const boxY = height - 68;

    ctx.fillStyle = 'rgba(9, 13, 22, 0.82)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, 42, 8);
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.textAlign = 'center';
    ctx.fillText(subText, width / 2, boxY + 27, boxW - 20);
    ctx.restore();
  }

  if (options.showTimecodeBurnIn) {
    ctx.save();
    const shotBadge = (scene.shotType || 'medium').replace('_', ' ').toUpperCase();
    ctx.fillStyle = 'rgba(9, 13, 22, 0.72)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(18, 16, 265, 32, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = '700 12px "JetBrains Mono", monospace';
    ctx.fillText(formatTimecode(globalFrame), 28, 36);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillText(
      `F:${String(globalFrame).padStart(4, '0')} · S${sceneIndex + 1} (${shotBadge})`,
      104,
      36
    );
    ctx.restore();
  }
}

export function renderProjectFrame(
  ctx: CanvasRenderingContext2D,
  project: AnimationProject,
  globalFrame: number,
  options: RenderOptions = {
    showOnionSkin: false,
    showTimecodeBurnIn: true,
    showSafeGuides: false,
    showSubtitles: true,
  }
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  ctx.clearRect(0, 0, width, height);

  if (!project.scenes || project.scenes.length === 0) return;

  const { scene, sceneIndex, localFrame, sceneProgress } = resolveSceneAtFrame(
    project,
    globalFrame
  );

  // 1. Render current scene
  const activeDialogues = renderSceneVisualLayer(
    ctx,
    project,
    scene,
    sceneIndex,
    localFrame,
    sceneProgress,
    globalFrame,
    width,
    height
  );

  // 2. Smooth 24-frame (1.0s) Cross-Dissolve Transition into the next scene
  const TRANSITION_FRAMES = Math.min(24, Math.floor(Math.max(24, scene.durationFrames) * 0.35));
  const framesRemaining = Math.max(24, scene.durationFrames) - localFrame;
  const nextScene =
    sceneIndex + 1 < project.scenes.length ? project.scenes[sceneIndex + 1] : null;

  if (
    nextScene &&
    framesRemaining <= TRANSITION_FRAMES &&
    scene.transitionToNext !== 'smooth_cut'
  ) {
    const rawT = (TRANSITION_FRAMES - framesRemaining + 1) / (TRANSITION_FRAMES + 1);
    const blendAlpha = easeInOutCubic(clamp(rawT, 0, 1));
    const buffer = getTransitionBuffer(width, height);
    if (buffer) {
      const bufCtx = buffer.getContext('2d');
      if (bufCtx) {
        bufCtx.clearRect(0, 0, width, height);
        const nextLocalFrame = TRANSITION_FRAMES - framesRemaining;
        const nextDur = Math.max(24, nextScene.durationFrames);
        const nextProgress = nextDur > 1 ? nextLocalFrame / (nextDur - 1) : 0;

        renderSceneVisualLayer(
          bufCtx,
          project,
          nextScene,
          sceneIndex + 1,
          nextLocalFrame,
          nextProgress,
          globalFrame,
          width,
          height
        );

        ctx.save();
        ctx.globalAlpha = blendAlpha;
        ctx.drawImage(buffer, 0, 0);
        ctx.restore();

        // Warm golden-hour bloom during fade_through_gold transitions
        if (scene.transitionToNext === 'fade_through_gold') {
          const bloom = Math.sin(rawT * Math.PI) * 0.14;
          ctx.fillStyle = `rgba(253, 224, 71, ${bloom.toFixed(3)})`;
          ctx.fillRect(0, 0, width, height);
        }
      }
    }
  }

  // 3. Safe Guides, Subtitles & Timecode HUD
  drawSafeGuidesAndHUD(
    ctx,
    scene,
    sceneIndex,
    globalFrame,
    activeDialogues,
    options,
    width,
    height
  );
}
