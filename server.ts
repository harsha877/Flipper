import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
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
      description: "Duration of the scene in seconds (between 3 and 8 seconds). Will be multiplied by 24 for 24 FPS.",
    },
    environmentTheme: {
      type: Type.STRING,
      description:
        "One of: forest, cyber_city, space_station, sunset_desert, cozy_studio, ocean_cliff",
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
      description: "One of: none, monolith, ramen_cart, campfire, console_desk, lantern, telescope, crate",
    },
    characterPlacements: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          characterId: { type: Type.STRING, description: "Must match a character id" },
          startX: {
            type: Type.NUMBER,
            description: "Horizontal start position percentage from 15 to 85",
          },
          startY: {
            type: Type.NUMBER,
            description: "Vertical ground position percentage from 62 to 78",
          },
          endX: {
            type: Type.NUMBER,
            description: "Horizontal end position percentage from 15 to 85",
          },
          endY: {
            type: Type.NUMBER,
            description: "Vertical end position percentage from 62 to 78",
          },
          scale: {
            type: Type.NUMBER,
            description: "Character scale multiplier between 0.85 and 1.3",
          },
          action: {
            type: Type.STRING,
            description:
              "One of: idle, walk, run, talk, wave, jump, celebrate, think, inspect",
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
            description: "Engaging spoken dialogue line (under 140 characters)",
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
    "environmentTheme",
    "timeOfDay",
    "weatherEffect",
    "cameraMotion",
    "foregroundProp",
    "characterPlacements",
    "dialogues",
  ],
};

// POST /api/storyboard/generate
app.post("/api/storyboard/generate", async (req, res) => {
  try {
    const { prompt, sceneCount = 4, visualStyle = "Cel-Shaded Adventure" } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ error: "Please provide a story prompt or script." });
      return;
    }

    const ai = getGeminiClient();
    const clampedScenes = Math.min(Math.max(Number(sceneCount) || 4, 2), 6);

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Create a complete ${clampedScenes}-scene 24 FPS animated story project based on this user prompt: "${prompt.trim()}"
Visual Style: ${visualStyle}.
Ensure characters have expressive contrasting hex colors, natural movement across the stage (startX to endX), varied camera motions, atmospheric weather, and well-timed spoken dialogue lines that fit within each scene's durationSeconds.`,
      config: {
        systemInstruction:
          "You are a master 24 FPS animation director and storyboard artist. Break stories into vivid animated scenes with 2 to 3 recurring characters, expressive poses, dynamic camera movements, and punchy character dialogue. Always use valid enum strings requested in the schema.",
        responseMimeType: "application/json",
        responseSchema: {
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
        },
      },
    });

    const rawText = (response.text ?? "{}").trim();
    const parsed = JSON.parse(rawText);

    const FPS = 24;
    const project = {
      id: `proj_${Date.now()}`,
      title: parsed.title || "Untitled 24 FPS Short",
      prompt: prompt.trim(),
      logline: parsed.logline || "",
      fps: FPS,
      width: 1280,
      height: 720,
      visualStyle: parsed.visualStyle || visualStyle,
      characters: (parsed.characters || []).map((c: any, idx: number) => ({
        id: c.id || `char_${idx + 1}`,
        name: c.name || `Character ${idx + 1}`,
        role: c.role || "Protagonist",
        primaryColor: c.primaryColor || "#F59E0B",
        secondaryColor: c.secondaryColor || "#38BDF8",
        skinOrFurColor: c.skinOrFurColor || "#FDE68A",
        bodyType: c.bodyType || "humanoid",
        accessory: c.accessory || "none",
      })),
      scenes: (parsed.scenes || []).map((s: any, idx: number) => {
        const durSec = Math.max(3, Math.min(10, Math.round(Number(s.durationSeconds) || 4)));
        const durationFrames = durSec * FPS;
        return {
          id: s.id || `scene_${idx + 1}`,
          title: s.title || `Scene ${idx + 1}`,
          narrativeSummary: s.narrativeSummary || "",
          durationFrames,
          environmentTheme: s.environmentTheme || "forest",
          timeOfDay: s.timeOfDay || "dusk",
          weatherEffect: s.weatherEffect || "fireflies",
          cameraMotion: s.cameraMotion || "pan_right",
          foregroundProp: s.foregroundProp || "none",
          characterPlacements: (s.characterPlacements || []).map((cp: any) => ({
            characterId: cp.characterId || parsed.characters?.[0]?.id || "char_1",
            startX: Math.max(12, Math.min(88, Number(cp.startX) || 30)),
            startY: Math.max(60, Math.min(80, Number(cp.startY) || 72)),
            endX: Math.max(12, Math.min(88, Number(cp.endX) || 55)),
            endY: Math.max(60, Math.min(80, Number(cp.endY) || 72)),
            scale: Math.max(0.75, Math.min(1.4, Number(cp.scale) || 1)),
            action: cp.action || "talk",
            expression: cp.expression || "happy",
            facing: cp.facing === "left" ? "left" : "right",
          })),
          dialogues: (s.dialogues || []).map((d: any, dIdx: number) => {
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
              id: d.id || `dlg_${idx}_${dIdx}`,
              characterId: d.characterId || parsed.characters?.[0]?.id || "char_1",
              speakerName: d.speakerName || "Speaker",
              text: d.text || "",
              startFrameOffset,
              durationFrames: lineFrames,
            };
          }),
        };
      }),
    };

    res.json({ project });
  } catch (error: any) {
    console.error("Error generating storyboard:", error);
    const status = error?.status || 500;
    res.status(status).json({
      error:
        error?.message ||
        "Failed to generate 24 FPS storyboard with Gemini AI. Please check your API key in Settings > Secrets.",
    });
  }
});

// POST /api/storyboard/regenerate-scene
app.post("/api/storyboard/regenerate-scene", async (req, res) => {
  try {
    const { projectTitle, characters, scenePrompt, currentScene } = req.body;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Project: "${projectTitle}"
Available Characters: ${JSON.stringify(characters)}
Current Scene Context: ${JSON.stringify(currentScene)}
User Direction for New/Updated Scene: "${scenePrompt || "Make this scene more dynamic with expressive dialogue and action"}"
Generate a single updated 24 FPS scene object matching the schema.`,
      config: {
        systemInstruction:
          "You are a 24 FPS animation director. Return a single refined scene using the provided character IDs.",
        responseMimeType: "application/json",
        responseSchema: SCENE_SCHEMA,
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").trim());
    const FPS = 24;
    const durSec = Math.max(3, Math.min(10, Math.round(Number(parsed.durationSeconds) || 4)));
    const durationFrames = durSec * FPS;

    const updatedScene = {
      id: currentScene?.id || `scene_${Date.now()}`,
      title: parsed.title || currentScene?.title || "Updated Scene",
      narrativeSummary: parsed.narrativeSummary || "",
      durationFrames,
      environmentTheme: parsed.environmentTheme || "forest",
      timeOfDay: parsed.timeOfDay || "dusk",
      weatherEffect: parsed.weatherEffect || "fireflies",
      cameraMotion: parsed.cameraMotion || "zoom_in",
      foregroundProp: parsed.foregroundProp || "none",
      characterPlacements: (parsed.characterPlacements || []).map((cp: any) => ({
        characterId: cp.characterId || characters?.[0]?.id || "char_1",
        startX: Math.max(12, Math.min(88, Number(cp.startX) || 35)),
        startY: Math.max(60, Math.min(80, Number(cp.startY) || 72)),
        endX: Math.max(12, Math.min(88, Number(cp.endX) || 60)),
        endY: Math.max(60, Math.min(80, Number(cp.endY) || 72)),
        scale: Math.max(0.75, Math.min(1.4, Number(cp.scale) || 1)),
        action: cp.action || "talk",
        expression: cp.expression || "excited",
        facing: cp.facing === "left" ? "left" : "right",
      })),
      dialogues: (parsed.dialogues || []).map((d: any, dIdx: number) => {
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

    res.json({ scene: updatedScene });
  } catch (error: any) {
    console.error("Error regenerating scene:", error);
    res.status(error?.status || 500).json({
      error: error?.message || "Failed to regenerate scene.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CelFrame 24 Studio Server running on http://localhost:${PORT}`);
  });
}

startServer();
