import {
  AnimationProject,
  CharacterActionSpec,
  CharacterSpec,
  DialogueLineSpec,
  EnvironmentTheme,
  ForegroundProp,
  RenderOptions,
  SceneSpec,
  TimeOfDay,
  WeatherEffect,
  formatTimecode,
  getProjectTotalFrames,
  resolveSceneAtFrame,
} from '../types/animation';

const SKY_PALETTES: Record<TimeOfDay, [string, string, string]> = {
  dawn: ['#1E1B4B', '#7C3AED', '#FDBA74'],
  day: ['#0369A1', '#38BDF8', '#BAE6FD'],
  dusk: ['#0F172A', '#6D28D9', '#F97316'],
  night: ['#020617', '#0F172A', '#1E293B'],
};

const GROUND_COLORS: Record<EnvironmentTheme, [string, string]> = {
  forest: ['#064E3B', '#022C22'],
  cyber_city: ['#1E1B4B', '#0F172A'],
  space_station: ['#1E293B', '#090D16'],
  sunset_desert: ['#9A3412', '#431407'],
  cozy_studio: ['#451A03', '#271001'],
  ocean_cliff: ['#1E3A8A', '#0F172A'],
};

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Pure deterministic 24 FPS frame renderer.
 */
export function renderProjectFrame(
  ctx: CanvasRenderingContext2D,
  project: AnimationProject,
  globalFrame: number,
  options: RenderOptions
): void {
  const width = project.width || 1280;
  const height = project.height || 720;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  if (!project.scenes || project.scenes.length === 0) {
    ctx.fillStyle = '#0B0F17';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return;
  }

  const { scene, sceneIndex, localFrame, sceneProgress } = resolveSceneAtFrame(
    project,
    globalFrame
  );

  // Compute camera transform at 24 FPS
  ctx.save();
  applyCameraTransform(ctx, width, height, scene.cameraMotion, sceneProgress, localFrame);

  // 1. Sky & Celestial Body
  drawSkyAndCelestial(ctx, width, height, scene.timeOfDay, localFrame);

  // 2. Environment Parallax Backdrop
  drawEnvironmentBackdrop(
    ctx,
    width,
    height,
    scene.environmentTheme,
    scene.timeOfDay,
    localFrame
  );

  // 3. Foreground Stage Prop
  drawStageProp(ctx, width, height, scene.foregroundProp, localFrame);

  // 4. Active Dialogues at this exact 24 FPS frame
  const activeDialogues = scene.dialogues.filter(
    (d) =>
      localFrame >= d.startFrameOffset &&
      localFrame <= d.startFrameOffset + d.durationFrames
  );

  // 5. Optional Onion Skinning (-2 frames in Cyan, +2 frames in Amber)
  if (options.showOnionSkin) {
    const prevLocal = Math.max(0, localFrame - 2);
    const nextLocal = Math.min(scene.durationFrames - 1, localFrame + 2);
    const dur = Math.max(24, scene.durationFrames);

    if (prevLocal !== localFrame) {
      drawCharactersForFrame(
        ctx,
        width,
        height,
        project.characters,
        scene,
        prevLocal,
        prevLocal / (dur - 1),
        [],
        'rgba(56, 189, 248, 0.25)'
      );
    }
    if (nextLocal !== localFrame) {
      drawCharactersForFrame(
        ctx,
        width,
        height,
        project.characters,
        scene,
        nextLocal,
        nextLocal / (dur - 1),
        [],
        'rgba(245, 158, 11, 0.25)'
      );
    }
  }

  // 6. Main 24 FPS Articulated Characters
  drawCharactersForFrame(
    ctx,
    width,
    height,
    project.characters,
    scene,
    localFrame,
    sceneProgress,
    activeDialogues,
    null
  );

  // 7. Weather & Atmospheric Particles (24 FPS deterministic)
  drawWeatherParticles(ctx, width, height, scene.weatherEffect, globalFrame);

  ctx.restore(); // End camera transform

  // 8. On-Stage Speech Bubbles & Cinema Subtitles
  if (options.showSubtitles && activeDialogues.length > 0) {
    drawCinemaSubtitles(ctx, width, height, activeDialogues, project.characters);
  }

  // 9. Optional Studio Safe Frame Guides
  if (options.showSafeGuides) {
    drawSafeFrameGuides(ctx, width, height);
  }

  // 10. Optional SMPTE 24 FPS Timecode Burn-In Overlay
  if (options.showTimecodeBurnIn) {
    drawTimecodeBurnIn(
      ctx,
      width,
      height,
      globalFrame,
      getProjectTotalFrames(project),
      sceneIndex,
      scene,
      localFrame
    );
  }

  ctx.restore();
}

function applyCameraTransform(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cameraMotion: SceneSpec['cameraMotion'],
  progress: number,
  localFrame: number
) {
  const t = easeInOutQuad(progress);
  let scale = 1.04;
  let offsetX = 0;
  let offsetY = 0;

  switch (cameraMotion) {
    case 'pan_right':
      scale = 1.1;
      offsetX = (0.5 - t) * width * 0.08;
      break;
    case 'pan_left':
      scale = 1.1;
      offsetX = (t - 0.5) * width * 0.08;
      break;
    case 'zoom_in':
      scale = 1.0 + t * 0.18;
      offsetY = -t * height * 0.03;
      break;
    case 'zoom_out':
      scale = 1.18 - t * 0.16;
      offsetY = -(1 - t) * height * 0.03;
      break;
    case 'dramatic_push':
      scale = 1.02 + Math.pow(progress, 1.7) * 0.25;
      offsetX = Math.sin(localFrame * 0.25) * 2.5;
      offsetY = -progress * height * 0.04;
      break;
    case 'static':
    default:
      scale = 1.02;
      break;
  }

  ctx.translate(width / 2 + offsetX, height / 2 + offsetY);
  ctx.scale(scale, scale);
  ctx.translate(-width / 2, -height / 2);
}

function drawSkyAndCelestial(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeOfDay: TimeOfDay,
  localFrame: number
) {
  const [topColor, midColor, horizonColor] =
    SKY_PALETTES[timeOfDay] || SKY_PALETTES.dusk;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.75);
  skyGrad.addColorStop(0, topColor);
  skyGrad.addColorStop(0.55, midColor);
  skyGrad.addColorStop(1, horizonColor);

  ctx.fillStyle = skyGrad;
  ctx.fillRect(-100, -100, width + 200, height + 200);

  // Sun or Moon
  const orbX = width * 0.76;
  const orbY = timeOfDay === 'day' ? height * 0.22 : height * 0.26;
  const pulse = Math.sin(localFrame * 0.08) * 4;

  const glow = ctx.createRadialGradient(orbX, orbY, 10, orbX, orbY, 110 + pulse);
  if (timeOfDay === 'night') {
    glow.addColorStop(0, 'rgba(226, 232, 240, 0.95)');
    glow.addColorStop(0.35, 'rgba(148, 163, 184, 0.25)');
    glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
  } else {
    glow.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    glow.addColorStop(0.4, 'rgba(251, 146, 60, 0.3)');
    glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
  }

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(orbX, orbY, 115 + pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = timeOfDay === 'night' ? '#F8FAFC' : '#FEF08A';
  ctx.beginPath();
  ctx.arc(orbX, orbY, 34, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnvironmentBackdrop(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: EnvironmentTheme,
  timeOfDay: TimeOfDay,
  localFrame: number
) {
  const groundY = height * 0.72;

  // Distant silhouette hills / skyline
  ctx.fillStyle =
    timeOfDay === 'day' ? 'rgba(15, 23, 42, 0.28)' : 'rgba(2, 6, 23, 0.55)';
  ctx.beginPath();
  ctx.moveTo(-80, groundY);
  for (let x = -80; x <= width + 80; x += 80) {
    const wave =
      Math.sin(x * 0.005 + 1.2) * 65 + Math.cos(x * 0.012) * 35;
    ctx.lineTo(x, groundY - 95 - wave);
  }
  ctx.lineTo(width + 80, groundY);
  ctx.closePath();
  ctx.fill();

  // Theme-specific mid-ground details
  if (theme === 'cyber_city') {
    const buildings = [
      { x: 90, w: 95, h: 260, c: '#0F172A' },
      { x: 210, w: 120, h: 320, c: '#1E1B4B' },
      { x: 360, w: 85, h: 220, c: '#0F172A' },
      { x: 520, w: 130, h: 350, c: '#172554' },
      { x: 740, w: 110, h: 290, c: '#1E1B4B' },
      { x: 900, w: 140, h: 340, c: '#0F172A' },
      { x: 1080, w: 100, h: 250, c: '#1E1B4B' },
    ];
    buildings.forEach((b, idx) => {
      ctx.fillStyle = b.c;
      ctx.fillRect(b.x, groundY - b.h, b.w, b.h);
      ctx.strokeStyle = idx % 2 === 0 ? '#38BDF8' : '#F43F5E';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, groundY - b.h, b.w, b.h);

      // Animated neon windows
      for (let wy = groundY - b.h + 24; wy < groundY - 30; wy += 28) {
        for (let wx = b.x + 14; wx < b.x + b.w - 18; wx += 22) {
          const lit = (wx + wy + Math.floor(localFrame / 12)) % 3 !== 0;
          ctx.fillStyle = lit
            ? idx % 2 === 0
              ? 'rgba(56, 189, 248, 0.7)'
              : 'rgba(244, 63, 94, 0.65)'
            : 'rgba(15, 23, 42, 0.8)';
          ctx.fillRect(wx, wy, 10, 14);
        }
      }
    });
  } else if (theme === 'forest') {
    // Giant glowing trees / bioluminescent mushrooms
    const trees = [110, 260, 460, 820, 1040, 1180];
    trees.forEach((tx, i) => {
      const sway = Math.sin(localFrame * 0.06 + i) * 4;
      const trunkH = 170 + (i % 3) * 35;

      // Stem / Trunk
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(tx - 14, groundY);
      ctx.quadraticCurveTo(tx + sway, groundY - trunkH * 0.5, tx - 6 + sway, groundY - trunkH);
      ctx.lineTo(tx + 8 + sway, groundY - trunkH);
      ctx.quadraticCurveTo(tx + sway, groundY - trunkH * 0.5, tx + 16, groundY);
      ctx.fill();

      // Bioluminescent canopy cap
      const capColor = i % 2 === 0 ? '#10B981' : '#8B5CF6';
      ctx.fillStyle = capColor;
      ctx.beginPath();
      ctx.ellipse(
        tx + sway,
        groundY - trunkH,
        68 + (i % 2) * 18,
        36,
        0,
        Math.PI,
        Math.PI * 2
      );
      ctx.fill();

      // Glowing underside gills
      ctx.fillStyle = i % 2 === 0 ? '#A7F3D0' : '#DDD6FE';
      ctx.beginPath();
      ctx.ellipse(tx + sway, groundY - trunkH, 52, 10, 0, 0, Math.PI);
      ctx.fill();
    });
  } else if (theme === 'space_station') {
    // Viewport framing & sci-fi rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(width * 0.5, groundY - 120, 240, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(
      width * 0.5,
      groundY - 120,
      190,
      Math.PI + localFrame * 0.01,
      Math.PI * 1.85 + localFrame * 0.01
    );
    ctx.stroke();
  } else if (theme === 'ocean_cliff') {
    // Animated ocean waves below cliff
    for (let layer = 0; layer < 3; layer++) {
      const waveY = groundY - 45 + layer * 16;
      ctx.fillStyle =
        layer === 0 ? '#0284C7' : layer === 1 ? '#0369A1' : '#075985';
      ctx.beginPath();
      ctx.moveTo(-100, height);
      for (let x = -100; x <= width + 100; x += 40) {
        const y =
          waveY + Math.sin(x * 0.02 + localFrame * 0.1 + layer) * 8;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width + 100, height);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Main Ground Stage Floor
  const [gTop, gBottom] = GROUND_COLORS[theme] || GROUND_COLORS.forest;
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, height + 80);
  groundGrad.addColorStop(0, gTop);
  groundGrad.addColorStop(1, gBottom);

  ctx.fillStyle = groundGrad;
  ctx.fillRect(-100, groundY, width + 200, height - groundY + 120);

  // Horizon Rim Highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-100, groundY);
  ctx.lineTo(width + 100, groundY);
  ctx.stroke();
}

function drawStageProp(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  prop: ForegroundProp,
  localFrame: number
) {
  if (!prop || prop === 'none') return;
  const groundY = height * 0.73;
  const centerX = width * 0.5;

  ctx.save();
  if (prop === 'monolith') {
    const hover = Math.sin(localFrame * 0.12) * 8;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(centerX, groundY + 12, 46, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Obelisk body
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 34, groundY - 10 + hover);
    ctx.lineTo(centerX - 24, groundY - 210 + hover);
    ctx.lineTo(centerX, groundY - 245 + hover);
    ctx.lineTo(centerX + 24, groundY - 210 + hover);
    ctx.lineTo(centerX + 34, groundY - 10 + hover);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing rune core
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(centerX, groundY - 130 + hover, 12 + Math.sin(localFrame * 0.2) * 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (prop === 'ramen_cart') {
    const cartX = width * 0.48;
    // Counter base
    ctx.fillStyle = '#78350F';
    ctx.fillRect(cartX - 110, groundY - 90, 220, 95);
    ctx.fillStyle = '#B45309';
    ctx.fillRect(cartX - 118, groundY - 98, 236, 14);
    // Roof pillars
    ctx.fillRect(cartX - 105, groundY - 210, 10, 120);
    ctx.fillRect(cartX + 95, groundY - 210, 10, 120);
    // Noren curtains
    ctx.fillStyle = '#991B1B';
    for (let i = -3; i <= 2; i++) {
      ctx.fillRect(cartX + i * 34 + 4, groundY - 210, 28, 42);
    }
    // Steaming ramen bowl
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(cartX + 20, groundY - 100, 18, 0, Math.PI);
    ctx.fill();
    // Rising 24 FPS steam wisps
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.6)';
    ctx.lineWidth = 2;
    for (let s = 0; s < 3; s++) {
      const sy = groundY - 118 - ((localFrame * 2 + s * 15) % 45);
      const sx = cartX + 12 + s * 8 + Math.sin(localFrame * 0.2 + s) * 5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + 6, sy - 8, sx, sy - 16);
      ctx.stroke();
    }
  } else if (prop === 'telescope') {
    const tx = width * 0.52;
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 5;
    // Tripod legs
    ctx.beginPath();
    ctx.moveTo(tx, groundY - 75);
    ctx.lineTo(tx - 32, groundY + 8);
    ctx.moveTo(tx, groundY - 75);
    ctx.lineTo(tx + 32, groundY + 8);
    ctx.moveTo(tx, groundY - 75);
    ctx.lineTo(tx, groundY + 12);
    ctx.stroke();

    // Brass tube
    ctx.save();
    ctx.translate(tx, groundY - 80);
    ctx.rotate(-0.35 + Math.sin(localFrame * 0.04) * 0.04);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-45, -12, 95, 22);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(46, -14, 10, 26);
    ctx.restore();
  } else if (prop === 'campfire') {
    const fx = width * 0.5;
    ctx.fillStyle = '#451A03';
    ctx.fillRect(fx - 35, groundY - 8, 70, 14);
    const flicker = Math.sin(localFrame * 0.45) * 8;
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(fx - 26, groundY - 4);
    ctx.quadraticCurveTo(fx, groundY - 68 + flicker, fx + 26, groundY - 4);
    ctx.fill();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.moveTo(fx - 14, groundY - 4);
    ctx.quadraticCurveTo(fx, groundY - 42 - flicker * 0.5, fx + 14, groundY - 4);
    ctx.fill();
  } else if (prop === 'lantern' || prop === 'crate' || prop === 'console_desk') {
    const px = width * 0.5;
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.fillRect(px - 36, groundY - 56, 72, 60);
    ctx.strokeRect(px - 36, groundY - 56, 72, 60);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(px - 20, groundY - 40, 40, 14);
  }
  ctx.restore();
}

function drawCharactersForFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  characters: CharacterSpec[],
  scene: SceneSpec,
  localFrame: number,
  sceneProgress: number,
  activeDialogues: DialogueLineSpec[],
  silhouetteTint: string | null
) {
  scene.characterPlacements.forEach((placement) => {
    const spec =
      characters.find((c) => c.id === placement.characterId) || characters[0];
    if (!spec) return;

    const isSpeaking = activeDialogues.some(
      (d) => d.characterId === spec.id
    );

    drawSingleCharacterRig(
      ctx,
      width,
      height,
      spec,
      placement,
      localFrame,
      sceneProgress,
      isSpeaking,
      silhouetteTint
    );
  });
}

function drawSingleCharacterRig(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spec: CharacterSpec,
  placement: CharacterActionSpec,
  localFrame: number,
  sceneProgress: number,
  isSpeaking: boolean,
  silhouetteTint: string | null
) {
  const t = easeInOutQuad(sceneProgress);
  const posX =
    ((placement.startX + (placement.endX - placement.startX) * t) / 100) * width;
  const posY =
    ((placement.startY + (placement.endY - placement.startY) * t) / 100) *
    height;

  const isMoving =
    Math.abs(placement.endX - placement.startX) > 2 ||
    placement.action === 'walk' ||
    placement.action === 'run';

  const walkFreq = placement.action === 'run' ? 0.55 : 0.32;
  const stepCycle = isMoving ? Math.sin(localFrame * walkFreq) : 0;
  const bounceY = isMoving
    ? Math.abs(Math.sin(localFrame * walkFreq)) * 9
    : placement.action === 'jump' || placement.action === 'celebrate'
    ? Math.abs(Math.sin(localFrame * 0.35)) * 28
    : Math.sin(localFrame * 0.12) * 2.5;

  const dir = placement.facing === 'left' ? -1 : 1;
  const scale = placement.scale || 1;

  ctx.save();
  ctx.translate(posX, posY);
  ctx.scale(scale, scale);

  // Ground shadow
  if (!silhouetteTint) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 34 - bounceY * 0.3, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(0, -bounceY);
  ctx.scale(dir, 1);

  const primary = silhouetteTint || spec.primaryColor || '#F59E0B';
  const secondary = silhouetteTint || spec.secondaryColor || '#38BDF8';
  const skin = silhouetteTint || spec.skinOrFurColor || '#FDE68A';
  const outline = silhouetteTint || '#0F172A';

  // Cape or Backpack (behind torso)
  if (spec.accessory === 'cape') {
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(-12, -88);
    ctx.quadraticCurveTo(
      -42 - Math.sin(localFrame * 0.25) * 10,
      -45,
      -34,
      -10
    );
    ctx.lineTo(-6, -24);
    ctx.closePath();
    ctx.fill();
  } else if (spec.accessory === 'backpack') {
    ctx.fillStyle = secondary;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-34, -86, 22, 42, 6);
    ctx.fill();
    ctx.stroke();
  }

  // Tail for Fox / Cat
  if (spec.bodyType === 'animal_fox' || spec.bodyType === 'animal_cat') {
    const tailWag = Math.sin(localFrame * 0.22) * 0.25;
    ctx.save();
    ctx.translate(-16, -42);
    ctx.rotate(tailWag);
    ctx.fillStyle = skin;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(-22, -6, 24, 11, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Legs (24 FPS articulated stride)
  ctx.lineCap = 'round';
  ctx.lineWidth = 10;
  ctx.strokeStyle = silhouetteTint || '#1E293B';

  // Back leg
  ctx.save();
  ctx.translate(-6, -38);
  ctx.rotate(-stepCycle * 0.45);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 42);
  ctx.stroke();
  ctx.restore();

  // Front leg
  ctx.save();
  ctx.translate(8, -38);
  ctx.rotate(stepCycle * 0.45);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 42);
  ctx.stroke();
  ctx.restore();

  // Torso
  ctx.fillStyle = primary;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-20, -92, 40, 56, 14);
  ctx.fill();
  ctx.stroke();

  // Chest Stripe / Detail
  ctx.fillStyle = secondary;
  ctx.beginPath();
  ctx.roundRect(-12, -80, 24, 16, 4);
  ctx.fill();

  // Scarf accessory
  if (spec.accessory === 'scarf') {
    ctx.fillStyle = secondary;
    ctx.fillRect(-22, -96, 44, 12);
    ctx.fillRect(-18, -90, 12, 28);
  }

  // Head
  const headNod = isSpeaking ? Math.sin(localFrame * 0.45) * 0.06 : 0;
  ctx.save();
  ctx.translate(0, -100);
  ctx.rotate(headNod);

  // Ears for Fox / Cat
  if (spec.bodyType === 'animal_fox' || spec.bodyType === 'animal_cat') {
    ctx.fillStyle = skin;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.5;
    // Left ear
    ctx.beginPath();
    ctx.moveTo(-22, -26);
    ctx.lineTo(-30, -54);
    ctx.lineTo(-8, -34);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(8, -34);
    ctx.lineTo(28, -54);
    ctx.lineTo(22, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Head Shape
  ctx.fillStyle = skin;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (spec.bodyType === 'robot') {
    ctx.roundRect(-26, -38, 52, 44, 8);
  } else {
    ctx.arc(0, -16, 26, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();

  // Eyes & Expressions (only when not rendering onion-skin silhouette)
  if (!silhouetteTint) {
    const isBlinking = localFrame % 72 >= 69;
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;

    if (isBlinking) {
      ctx.beginPath();
      ctx.moveTo(2, -20);
      ctx.lineTo(10, -20);
      ctx.moveTo(16, -20);
      ctx.lineTo(24, -20);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(6, -20, 3.5, 0, Math.PI * 2);
      ctx.arc(19, -20, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Eyebrows based on expression
    ctx.beginPath();
    if (placement.expression === 'determined' || placement.expression === 'skeptical') {
      ctx.moveTo(2, -29);
      ctx.lineTo(10, -26);
      ctx.moveTo(15, -26);
      ctx.lineTo(23, -29);
    } else if (placement.expression === 'surprised' || placement.expression === 'excited') {
      ctx.moveTo(2, -31);
      ctx.lineTo(10, -31);
      ctx.moveTo(15, -31);
      ctx.lineTo(23, -31);
    }
    ctx.stroke();

    // 24 FPS Phoneme Lip-Sync Mouth
    if (isSpeaking) {
      const mouthOpen = Math.abs(Math.sin(localFrame * 0.85)) * 7 + 2;
      ctx.fillStyle = '#991B1B';
      ctx.beginPath();
      ctx.ellipse(12, -7, 6, mouthOpen * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      if (placement.expression === 'happy' || placement.expression === 'excited') {
        ctx.arc(12, -9, 5, 0, Math.PI);
      } else if (placement.expression === 'surprised') {
        ctx.arc(12, -8, 3.5, 0, Math.PI * 2);
      } else {
        ctx.moveTo(8, -7);
        ctx.lineTo(16, -7);
      }
      ctx.stroke();
    }

    // Head Accessories
    if (spec.accessory === 'helmet' || spec.bodyType === 'astronaut') {
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.75)';
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -18, 33, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (spec.accessory === 'crown') {
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(-14, -40);
      ctx.lineTo(-10, -54);
      ctx.lineTo(0, -45);
      ctx.lineTo(10, -54);
      ctx.lineTo(14, -40);
      ctx.closePath();
      ctx.fill();
    } else if (spec.accessory === 'antenna' || spec.bodyType === 'robot') {
      ctx.strokeStyle = secondary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -38);
      ctx.lineTo(0, -54);
      ctx.stroke();
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(0, -56, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.accessory === 'glasses') {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, -25, 10, 9);
      ctx.strokeRect(14, -25, 10, 9);
    }
  }

  ctx.restore(); // End Head

  // Front Articulated Arm (gestures for wave, talk, celebrate, think)
  ctx.save();
  ctx.translate(4, -82);
  let armAngle = -stepCycle * 0.4;
  if (placement.action === 'wave' || placement.action === 'celebrate') {
    armAngle = -2.2 + Math.sin(localFrame * 0.5) * 0.35;
  } else if (placement.action === 'talk' || isSpeaking) {
    armAngle = -0.65 + Math.sin(localFrame * 0.35) * 0.25;
  } else if (placement.action === 'think' || placement.action === 'inspect') {
    armAngle = -1.15;
  }
  ctx.rotate(armAngle);
  ctx.strokeStyle = primary;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 34);
  ctx.stroke();
  ctx.restore();

  // Character Nameplate below feet (only on primary render)
  if (!silhouetteTint) {
    ctx.scale(dir, 1); // Unflip text
    ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
    ctx.fillText(spec.name, 0, 28);
  }

  ctx.restore();
}

function drawWeatherParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  weather: WeatherEffect,
  globalFrame: number
) {
  if (!weather || weather === 'clear') return;

  ctx.save();
  if (weather === 'rain') {
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 65; i++) {
      const rx = ((i * 97 + globalFrame * 14) % (width + 100)) - 50;
      const ry = ((i * 73 + globalFrame * 28) % (height + 100)) - 50;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8, ry + 22);
      ctx.stroke();
    }
  } else if (weather === 'snow') {
    ctx.fillStyle = 'rgba(248, 250, 252, 0.8)';
    for (let i = 0; i < 55; i++) {
      const sx =
        ((i * 113 + Math.sin(globalFrame * 0.05 + i) * 25) % width + width) %
        width;
      const sy = ((i * 83 + globalFrame * 4) % height + height) % height;
      const r = (i % 3) + 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (weather === 'fireflies' || weather === 'starfield') {
    for (let i = 0; i < 42; i++) {
      const fx =
        ((i * 131 + Math.sin(globalFrame * 0.04 + i) * 32) % width + width) %
        width;
      const fy =
        ((i * 67 + Math.cos(globalFrame * 0.03 + i) * 22) % (height * 0.75) +
          height * 0.75) %
        (height * 0.75);
      const alpha = 0.35 + Math.abs(Math.sin(globalFrame * 0.1 + i)) * 0.65;
      ctx.fillStyle =
        weather === 'fireflies'
          ? `rgba(250, 204, 21, ${alpha})`
          : `rgba(226, 232, 240, ${alpha})`;
      ctx.beginPath();
      ctx.arc(fx, fy, (i % 2) + 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawCinemaSubtitles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  activeDialogues: DialogueLineSpec[],
  characters: CharacterSpec[]
) {
  const line = activeDialogues[activeDialogues.length - 1];
  if (!line || !line.text) return;

  const speaker = characters.find((c) => c.id === line.characterId);
  const accentColor = speaker?.primaryColor || '#F59E0B';

  ctx.save();
  // Measured bottom gradient scrim for WCAG contrast
  const scrim = ctx.createLinearGradient(0, height - 150, 0, height);
  scrim.addColorStop(0, 'rgba(2, 6, 23, 0)');
  scrim.addColorStop(1, 'rgba(2, 6, 23, 0.85)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, height - 150, width, 150);

  // Subtitle box
  const boxWidth = Math.min(width * 0.76, 860);
  const boxX = (width - boxWidth) / 2;
  const boxY = height - 86;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, 56, 8);
  ctx.fill();
  ctx.stroke();

  ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = accentColor;
  ctx.fillText(
    `${line.speakerName.toUpperCase()}: "${line.text}"`,
    width / 2,
    boxY + 34,
    boxWidth - 32
  );
  ctx.restore();
}

function drawSafeFrameGuides(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1;

  // Title Safe 90%
  const padX = width * 0.05;
  const padY = height * 0.05;
  ctx.strokeRect(padX, padY, width - padX * 2, height - padY * 2);

  // Center crosshair
  ctx.beginPath();
  ctx.moveTo(width / 2 - 12, height / 2);
  ctx.lineTo(width / 2 + 12, height / 2);
  ctx.moveTo(width / 2, height / 2 - 12);
  ctx.lineTo(width / 2, height / 2 + 12);
  ctx.stroke();
  ctx.restore();
}

function drawTimecodeBurnIn(
  ctx: CanvasRenderingContext2D,
  width: number,
  _height: number,
  globalFrame: number,
  totalFrames: number,
  sceneIndex: number,
  scene: SceneSpec,
  localFrame: number
) {
  ctx.save();
  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
  ctx.lineWidth = 1;

  // Top-left timecode readout
  ctx.beginPath();
  ctx.roundRect(24, 20, 230, 34, 6);
  ctx.fill();
  ctx.stroke();

  ctx.font = '500 13px "JetBrains Mono", monospace';
  ctx.fillStyle = '#F8FAFC';
  ctx.textAlign = 'left';
  const smpte = formatTimecode(globalFrame);
  ctx.fillText(
    `TC ${smpte} · F${String(globalFrame + 1).padStart(3, '0')}/${String(
      totalFrames
    ).padStart(3, '0')}`,
    36,
    42
  );

  // Top-right Scene & Local Frame readout
  const rightText = `SC ${String(sceneIndex + 1).padStart(2, '0')}: ${scene.title.slice(
    0,
    22
  )} (F${localFrame + 1}/${scene.durationFrames})`;
  ctx.beginPath();
  ctx.roundRect(width - 334, 20, 310, 34, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#CBD5E1';
  ctx.textAlign = 'right';
  ctx.fillText(rightText, width - 36, 42);
  ctx.restore();
}
