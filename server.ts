import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import {
  buildSmartProjectFromPrompt,
  buildSmartSceneFromDirection,
  enforceProjectContinuity,
  hasActorsInPrompt,
} from "./src/engine/promptDirector";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 11000,
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

const MODEL_FALLBACK_CHAIN = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

async function generateWithFallback(
  ai: GoogleGenAI,
  contents: string,
  systemInstruction: string,
  responseSchema: any
): Promise<string> {
  // Race the configured Gemini models in parallel with an 11s deadline so we never trigger proxy 504 timeouts
  const modelPromises = MODEL_FALLBACK_CHAIN.map(async (modelName) => {
    const config: any = {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
    };

    if (modelName === "gemini-3.8-flash") {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
    }

    const response = await Promise.race([
      ai.models.generateContent({
        model: modelName,
        contents,
        config,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout on ${modelName}`)), 11500)
      ),
    ]);

    if (!response?.text) {
      throw new Error(`Empty response from ${modelName}`);
    }
    return response.text;
  });

  return Promise.any(modelPromises);
}

const CHARACTER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Unique short ID like char_1, char_2" },
    name: { type: Type.STRING, description: "Character display name" },
    role: { type: Type.STRING, description: "Brief role description (e.g., Curious Astronaut)" },
    primaryColor: { type: Type.STRING, description: "Hex color for outfit/body e.g. #F59E0B" },
    secondaryColor: { type: Type.STRING, description: "Hex accent color e.g. #38BDF8" },
    skinOrFurColor: { type: Type.STRING, description: "Hex color for face/head e.g. #FDE68A" },
    bodyType: {
      type: Type.STRING,
      description: "One of: humanoid, robot, animal_fox, animal_cat, astronaut, spirit",
    },
    accessory: {
      type: Type.STRING,
      description: "One of: none, helmet, scarf, glasses, crown, headphones, backpack, cape, antenna",
    },
  },
  required: [
    "id",
    "name",
    "role",
    "primaryColor",
    "secondaryColor",
    "skinOrFurColor",
    "bodyType",
    "accessory",
  ],
};

const SCENE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Unique scene ID like scene_1" },
    title: { type: Type.STRING, description: "Concise scene title" },
    narrativeSummary: {
      type: Type.STRING,
      description: "1-2 sentence action description of what happens in this scene",
    },
    durationSeconds: {
      type: Type.NUMBER,
      description: "Duration of the scene in seconds (between 2 and 8 seconds).",
    },
    shotType: {
      type: Type.STRING,
      description: "One of: wide, medium, close_up, over_shoulder",
    },
    environmentTheme: {
      type: Type.STRING,
      description:
        "One of: water_drop_macro, candy_shop, tropical_beach, forest, cyber_city, space_station, sunset_desert, cozy_studio, ocean_cliff",
    },
    timeOfDay: {
      type: Type.STRING,
      description: "One of: dawn, day, dusk, night",
    },
    weatherEffect: {
      type: Type.STRING,
      description: "One of: clear, rain, snow, fireflies, starfield",
    },
    cameraMotion: {
      type: Type.STRING,
      description:
        "One of: static, pan_left, pan_right, zoom_in, zoom_out, dramatic_push",
    },
    foregroundProp: {
      type: Type.STRING,
      description:
        "One of: none, water_drop, water_crown, water_ripples, water_still, candy_counter, candy_jars, beach_lounger, iced_drink, monolith, ramen_cart, campfire, console_desk, lantern, telescope, crate",
    },
    characterPlacements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          characterId: { type: Type.STRING, description: "Must match a character id" },
          startX: {
            type: Type.NUMBER,
            description: "Horizontal start position percentage from 15 to 85 (match endX if stationary)",
          },
          startY: {
            type: Type.NUMBER,
            description: "Vertical ground position percentage, always 74",
          },
          endX: {
            type: Type.NUMBER,
            description: "Horizontal end position percentage from 15 to 85",
          },
          endY: {
            type: Type.NUMBER,
            description: "Vertical end position percentage, always 74",
          },
          scale: {
            type: Type.NUMBER,
            description: "Character scale multiplier, always 1.0 for consistent proportions",
          },
          action: {
            type: Type.STRING,
            description:
              "One of: enter_door, scoop_candy, weigh_and_hand, eat_candy, relax_lounger, sip_drink, gaze_horizon, sit, idle, walk, run, talk, wave, jump, celebrate, think, inspect",
          },
          expression: {
            type: Type.STRING,
            description:
              "One of: neutral, happy, surprised, determined, skeptical, excited",
          },
          facing: {
            type: Type.STRING,
            description: "One of: left, right",
          },
        },
        required: [
          "characterId",
          "startX",
          "startY",
          "endX",
          "endY",
          "scale",
          "action",
          "expression",
          "facing",
        ],
      },
    },
    dialogues: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          characterId: { type: Type.STRING, description: "Must match a character id" },
          speakerName: { type: Type.STRING },
          text: {
            type: Type.STRING,
            description: "Spoken dialogue line (leave array empty [] if the scene is silent/atmospheric)",
          },
          startSecondOffset: {
            type: Type.NUMBER,
            description: "When the line starts inside the scene in seconds (e.g. 0.5)",
          },
          durationSeconds: {
            type: Type.NUMBER,
            description: "How long the line is spoken in seconds (e.g. 2.5)",
          },
        },
        required: [
          "id",
          "characterId",
          "speakerName",
          "text",
          "startSecondOffset",
          "durationSeconds",
        ],
      },
    },
  },
  required: [
    "id",
    "title",
    "narrativeSummary",
    "durationSeconds",
    "shotType",
    "environmentTheme",
    "timeOfDay",
    "weatherEffect",
    "cameraMotion",
    "foregroundProp",
    "characterPlacements",
    "dialogues",
  ],
};

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, fps: 24 });
});

// POST /api/storyboard/generate
app.post("/api/storyboard/generate", async (req, res) => {
  const { prompt, sceneCount = 3, visualStyle = "Cel-Shaded Adventure" } = req.body || {};
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "Please provide a story prompt or script." });
    return;
  }

  const clampedScenes = Math.min(Math.max(Number(sceneCount) || 3, 2), 6);
  const smartReference = buildSmartProjectFromPrompt(prompt, clampedScenes, visualStyle);
  const scriptHasActors = hasActorsInPrompt(prompt);

  // If the script has no actors, specifies multi-actor group choreography (e.g. three people walking together),
  // or has explicit Shot 1..4 breakdowns, use the deterministic Script-to-Shot Director directly so actor count,
  // walking direction, and continuous shot-to-shot transitions are 100% faithful.
  if (
    !scriptHasActors ||
    /\b(shot\s*1|three|3|four|4|five|5|trio|quartet|walking together|waling together|walk together|water drop|droplet|crown-shaped|ripples|candy shop|gummies|shopkeeper|beach lounger|iced drink)\b/i.test(
      prompt
    )
  ) {
    res.status(200).json({ project: smartReference });
    return;
  }

  try {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(200).json({ project: smartReference });
      return;
    }

    const rawText = await generateWithFallback(
      ai,
      `Create a complete animated story project based on this user prompt: "${prompt.trim()}"
Visual Style: ${visualStyle}.
CRITICAL RULES:
1. If the user prompt specifies Shot 1, Shot 2, Shot 3, Shot 4 (or explicit scenes), create a scene for EACH shot with matching shotType (wide, close_up, medium, over_shoulder). Otherwise create ${clampedScenes} scenes with varied shotTypes (wide, close_up, medium, over_shoulder).
2. ONLY create characters if the prompt mentions people, animals, robots, or characters. If there are no characters/actors in the prompt, return empty arrays for characters: [] and characterPlacements: [].
3. Use specific actions matching the script (enter_door, scoop_candy, weigh_and_hand, eat_candy, relax_lounger, sip_drink, gaze_horizon, sit, walk, talk, inspect, wave, celebrate).
4. If the prompt has no spoken dialogue, return an empty dialogues array [].`,
      "You are a master animation director and cinematographer. Match the exact character roles, wardrobe colors, shot framing (wide, close_up, medium, over_shoulder), and specific actions described in the user's prompt. Never invent characters if the script has no actors.",
      {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Catchy title for the animated short" },
          visualStyle: { type: Type.STRING },
          logline: { type: Type.STRING, description: "One sentence summary of the story" },
          characters: {
            type: Type.ARRAY,
            items: CHARACTER_SCHEMA,
          },
          scenes: {
            type: Type.ARRAY,
            items: SCENE_SCHEMA,
          },
        },
        required: ["title", "visualStyle", "logline", "characters", "scenes"],
      }
    );

    const parsed = JSON.parse(rawText.trim());

    const FPS = 24;
    const uid = Date.now().toString(36);
    const defaultShots = ["wide", "close_up", "medium", "over_shoulder"];
    const resolvedChars = !scriptHasActors
      ? []
      : (parsed.characters?.length ? parsed.characters : smartReference.characters).map(
          (c: any, idx: number) => ({
            id: `char_${uid}_${idx + 1}`,
            name: c.name || smartReference.characters[idx]?.name || `Character ${idx + 1}`,
            role: c.role || smartReference.characters[idx]?.role || "Protagonist",
            primaryColor: c.primaryColor || smartReference.characters[idx]?.primaryColor || "#F472B6",
            secondaryColor: c.secondaryColor || smartReference.characters[idx]?.secondaryColor || "#38BDF8",
            skinOrFurColor: c.skinOrFurColor || "#E5B887",
            bodyType: c.bodyType || "humanoid",
            accessory: c.accessory || "none",
          })
        );

    const project = {
      id: `proj_${uid}`,
      title: parsed.title || smartReference.title,
      prompt: prompt.trim(),
      logline: parsed.logline || smartReference.logline,
      fps: FPS,
      width: 1280,
      height: 720,
      visualStyle: parsed.visualStyle || visualStyle,
      characters: resolvedChars,
      scenes: (parsed.scenes?.length ? parsed.scenes : smartReference.scenes).map(
        (s: any, idx: number) => {
          const refScene = smartReference.scenes[idx] || smartReference.scenes[0];
          const durSec = Math.max(2, Math.min(10, Math.round(Number(s.durationSeconds) || 4)));
          const durationFrames = durSec * FPS;
          const shotType =
            ["wide", "medium", "close_up", "over_shoulder"].includes(s.shotType)
              ? s.shotType
              : refScene?.shotType || defaultShots[idx % defaultShots.length];
          return {
            id: `scene_${uid}_${idx + 1}`,
            title: s.title || refScene?.title || `Shot ${idx + 1}`,
            narrativeSummary: s.narrativeSummary || refScene?.narrativeSummary || "",
            durationFrames,
            shotType,
            environmentTheme: s.environmentTheme || refScene?.environmentTheme || "forest",
            timeOfDay: s.timeOfDay || refScene?.timeOfDay || "dusk",
            weatherEffect: s.weatherEffect || refScene?.weatherEffect || "clear",
            cameraMotion: s.cameraMotion || refScene?.cameraMotion || "zoom_in",
            foregroundProp: s.foregroundProp || refScene?.foregroundProp || "none",
            characterPlacements:
              resolvedChars.length === 0
                ? []
                : (s.characterPlacements || []).map((cp: any, cpIdx: number) => {
                    const refCp = refScene?.characterPlacements?.[cpIdx];
                    const action = cp.action || refCp?.action || "idle";
                    const isStationary = [
                      "scoop_candy",
                      "weigh_and_hand",
                      "eat_candy",
                      "relax_lounger",
                      "sip_drink",
                      "gaze_horizon",
                      "sit",
                      "idle",
                      "think",
                      "inspect",
                    ].includes(action);
                    const startX = Math.max(15, Math.min(85, Number(cp.startX) || refCp?.startX || 46));
                    const endX = isStationary
                      ? startX
                      : Math.max(15, Math.min(85, Number(cp.endX) || refCp?.endX || startX));
                    return {
                      characterId: `char_${uid}_${(cpIdx % resolvedChars.length) + 1}`,
                      startX,
                      startY: 74,
                      endX,
                      endY: 74,
                      scale: 1.0,
                      action,
                      expression: cp.expression || "happy",
                      facing: cp.facing === "left" ? "left" : "right",
                    };
                  }),
            dialogues: (s.dialogues || [])
              .filter((d: any) => d?.text && String(d.text).trim().length > 0)
              .map((d: any, dIdx: number) => {
                const startFrameOffset = Math.max(
                  0,
                  Math.min(
                    durationFrames - 24,
                    Math.round((Number(d.startSecondOffset) || dIdx * 2) * FPS)
                  )
                );
                const lineFrames = Math.max(
                  24,
                  Math.min(
                    durationFrames - startFrameOffset,
                    Math.round((Number(d.durationSeconds) || 2) * FPS)
                  )
                );
                return {
                  id: `dlg_${uid}_${idx}_${dIdx}`,
                  characterId: `char_${uid}_1`,
                  speakerName: d.speakerName || "Speaker",
                  text: d.text || "",
                  startFrameOffset,
                  durationFrames: lineFrames,
                };
              }),
          };
        }
      ),
    };

    const continuousProject = enforceProjectContinuity(project as any);
    res.status(200).json({ project: continuousProject });
  } catch (error: any) {
    console.warn("Gemini API spike or timeout, synthesizing via Prompt Director:", error?.message || error);
    const fallbackProject = buildSmartProjectFromPrompt(
      prompt,
      clampedScenes,
      visualStyle
    );
    res.status(200).json({ project: fallbackProject });
  }
});

// POST /api/storyboard/regenerate-scene
app.post("/api/storyboard/regenerate-scene", async (req, res) => {
  const { characters = [], scenePrompt = "", currentScene } = req.body || {};

  // Use deterministic Script-to-Shot director first so updated narrative summaries immediately
  // reflect the exact new environment, props, and actions without retaining old story state.
  const smartUpdated = buildSmartSceneFromDirection(
    currentScene,
    characters,
    scenePrompt
  );

  try {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(200).json({ scene: smartUpdated });
      return;
    }

    const rawText = await generateWithFallback(
      ai,
      `Available Characters: ${JSON.stringify(characters)}
New Scene Narrative Direction (ignore any previous story context): "${scenePrompt || smartUpdated.narrativeSummary}"
Generate a single updated scene object matching the schema based strictly on the New Scene Narrative Direction. Keep character scale at 1.0 and startY/endY at 74.`,
      "You are an animation director. Create a scene strictly from the user's new narrative direction without referencing any old story.",
      SCENE_SCHEMA
    );

    const parsed = JSON.parse(rawText.trim());
    const FPS = 24;
    const durSec = Math.max(2, Math.min(10, Math.round(Number(parsed.durationSeconds) || 4)));
    const durationFrames = durSec * FPS;

    const updatedScene = {
      id: currentScene?.id || `scene_${Date.now()}`,
      title: parsed.title || smartUpdated.title || "Updated Scene",
      narrativeSummary: smartUpdated.narrativeSummary || parsed.narrativeSummary || "",
      durationFrames,
      shotType: ["wide", "medium", "close_up", "over_shoulder"].includes(parsed.shotType)
        ? parsed.shotType
        : smartUpdated.shotType || "medium",
      environmentTheme: smartUpdated.environmentTheme || parsed.environmentTheme || "forest",
      timeOfDay: smartUpdated.timeOfDay || parsed.timeOfDay || "dusk",
      weatherEffect: smartUpdated.weatherEffect || parsed.weatherEffect || "clear",
      cameraMotion: parsed.cameraMotion || smartUpdated.cameraMotion || "zoom_in",
      foregroundProp: smartUpdated.foregroundProp || parsed.foregroundProp || "none",
      characterPlacements: (smartUpdated.characterPlacements?.length
        ? smartUpdated.characterPlacements
        : parsed.characterPlacements || []
      ).map((cp: any, cpIdx: number) => {
        const refCp = smartUpdated.characterPlacements?.[cpIdx];
        const action = refCp?.action || cp.action || "idle";
        const isStationary = [
          "scoop_candy",
          "weigh_and_hand",
          "eat_candy",
          "relax_lounger",
          "sip_drink",
          "gaze_horizon",
          "sit",
          "idle",
          "think",
          "inspect",
        ].includes(action);
        const startX = Math.max(15, Math.min(85, Number(refCp?.startX ?? cp.startX) || 46));
        const endX = isStationary
          ? startX
          : Math.max(15, Math.min(85, Number(refCp?.endX ?? cp.endX) || startX));
        return {
          characterId: cp.characterId || characters?.[cpIdx]?.id || characters?.[0]?.id || "char_1",
          startX,
          startY: 74,
          endX,
          endY: 74,
          scale: 1.0,
          action,
          expression: cp.expression || "happy",
          facing: cp.facing === "left" ? "left" : "right",
        };
      }),
      dialogues: (parsed.dialogues || [])
        .filter((d: any) => d?.text && String(d.text).trim().length > 0)
        .map((d: any, dIdx: number) => {
          const startFrameOffset = Math.max(
            0,
            Math.min(
              durationFrames - 24,
              Math.round((Number(d.startSecondOffset) || dIdx * 2) * FPS)
            )
          );
          const lineFrames = Math.max(
            24,
            Math.min(
              durationFrames - startFrameOffset,
              Math.round((Number(d.durationSeconds) || 2) * FPS)
            )
          );
          return {
            id: `dlg_${Date.now()}_${dIdx}`,
            characterId: d.characterId || characters?.[0]?.id || "char_1",
            speakerName: d.speakerName || "Character",
            text: d.text || "",
            startFrameOffset,
            durationFrames: lineFrames,
          };
        }),
    };

    res.status(200).json({ scene: updatedScene });
  } catch (error: any) {
    console.warn("Gemini scene regeneration spike, synthesizing via Prompt Director:", error?.message || error);
    res.status(200).json({ scene: smartUpdated });
  }
});

// Catch-all for any unmatched /api/* routes so Vite never serves <!doctype html> for API calls
app.all("/api/*", (_req, res) => {
  res.status(404).json({
    error: "API route not found.",
  });
});

async function startServer() {
  let viteMiddleware: any = null;

  if (process.env.NODE_ENV !== "production") {
    app.use((req, res, next) => {
      if (viteMiddleware) {
        return viteMiddleware(req, res, next);
      }
      next();
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind port 3000 immediately so Nginx never sees 502 Bad Gateway during startup
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Flipper Studio Server running on http://localhost:${PORT}`);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    viteMiddleware = vite.middlewares;
  }
}

startServer();
