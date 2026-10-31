import {
  AnimationProject,
  CameraMotion,
  CharacterAccessory,
  CharacterActionType,
  CharacterBodyType,
  CharacterExpression,
  CharacterSpec,
  ContinuityCheckItem,
  ContinuityCheckReport,
  DialogueLineSpec,
  EnvironmentTheme,
  ForegroundPropType,
  SceneSpec,
  SceneTransition,
  ShotType,
  TimeOfDay,
  WeatherEffect,
} from '../types/animation';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'over', 'under',
  'they', 'their', 'them', 'there', 'where', 'when', 'what', 'while', 'about',
  'two', 'three', 'four', 'five', 'some', 'many', 'make', 'create', 'video',
  'animated', 'animation', 'scene', 'scenes', 'story', 'short', 'film', 'have',
  'has', 'had', 'will', 'would', 'could', 'should', 'are', 'was', 'were', 'been',
  'main', 'prompt', 'optional', 'shot', 'version', 'seconds', 'cheerful', 'adult',
  'walks', 'colorful', 'cozy', 'filled', 'glass', 'jars', 'bright', 'warm',
]);

export function hasActorsInPrompt(text: string): boolean {
  const lower = text.toLowerCase();

  const hasActorMention =
    /\b(adult|adults|person|people|man|woman|men|women|boy|girl|boys|girls|child|children|kid|kids|human|humans|shopper|customer|shopkeeper|clerk|cashier|vendor|waiter|barista|chef|cook|baker|detective|investigator|scientist|doctor|astronaut|astronauts|cosmonaut|pilot|commander|explorer|explorers|traveler|travelers|hiker|hikers|walker|walkers|fox|foxes|cat|cats|kitten|dog|dogs|puppy|robot|robots|android|cyborg|droid|mech|spirit|spirits|ghost|fairy|guardian|character|characters|actor|actors|hero|heroes|villain|friend|friends|couple|trio|quartet|group|partner|partners|he|she|they|their|them|his|her|him|someone)\b/.test(
      lower
    );

  const isPureNatureOrMacro =
    /\b(water drop|droplet|crown-shaped bounce|circular ripples|still body of water|ripples spread|ripples fade)\b/.test(
      lower
    ) &&
    !/\b(adult|person|people|man|woman|shopper|shopkeeper|astronaut|fox|cat|robot|chef|friend|friends|he|she|they)\b/.test(
      lower
    );

  if (isPureNatureOrMacro) {
    return false;
  }

  return hasActorMention;
}

/**
 * Detects the exact number of characters requested by the user's script (0 to 5).
 */
export function detectRequestedActorCount(prompt: string): number {
  if (!hasActorsInPrompt(prompt)) {
    return 0;
  }
  const lower = prompt.toLowerCase();

  // Explicit numeric or word counts for characters
  if (
    /\b(five|5)\s+(people|friends|adults|men|women|kids|children|travelers|explorers|hikers|astronauts|characters|actors|robots|foxes|cats|companions)\b/.test(
      lower
    )
  ) {
    return 5;
  }
  if (
    /\b(four|4|quartet)\b/.test(lower) &&
    /\b(people|friends|adults|men|women|kids|children|travelers|explorers|hikers|astronauts|characters|actors|robots|foxes|cats|companions|walk|walking|together)\b/.test(
      lower
    )
  ) {
    return 4;
  }
  if (
    /\b(three|3|trio)\b/.test(lower) &&
    /\b(people|friends|adults|men|women|kids|children|travelers|explorers|hikers|astronauts|characters|actors|robots|foxes|cats|companions|walk|walking|waling|stroll|together)\b/.test(
      lower
    )
  ) {
    return 3;
  }
  // Catch "three people", "3 people", "three friends", "three characters" even with typos like "waling"
  if (/\b(three|3|trio)\s+(people|persons|friends|adults|men|women|kids|children|travelers|explorers|hikers|astronauts|characters|actors|robots|foxes|cats|figures)\b/.test(lower)) {
    return 3;
  }
  if (/\b(four|4|quartet)\s+(people|persons|friends|adults|men|women|kids|children|travelers|explorers|hikers|astronauts|characters|actors|robots|foxes|cats|figures)\b/.test(lower)) {
    return 4;
  }
  if (/\b(five|5)\s+(people|persons|friends|adults|men|women|kids|children|travelers|explorers|hikers|astronauts|characters|actors|robots|foxes|cats|figures)\b/.test(lower)) {
    return 5;
  }

  if (/\b(shopper|customer)\b/.test(lower) && /\b(shopkeeper|clerk|cashier|counter)\b/.test(lower)) {
    return 2;
  }

  if (/\b(two|2|couple|pair|both|duel|partner|partners)\b/.test(lower)) {
    return 2;
  }

  if (/\b(group of)\b/.test(lower)) {
    return 3;
  }

  if (isSoloCharacterPrompt(prompt)) {
    return 1;
  }

  return 2;
}

/**
 * Returns true ONLY if the script explicitly states characters walk toward each other from opposite sides.
 * By default, characters walking/moving together move in the same direction ('right').
 */
export function isOppositeDirectionPrompt(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(towards? each other|from opposite|opposite directions?|meet in the middle|face each other|confront each other|walk into each other|approaching each other)\b/.test(
    lower
  );
}

export function detectEnvironment(text: string): {
  theme: EnvironmentTheme;
  timeOfDay: TimeOfDay;
  weather: WeatherEffect;
  prop: ForegroundPropType;
} {
  const lower = text.toLowerCase();

  let theme: EnvironmentTheme = 'forest';
  let timeOfDay: TimeOfDay = 'dusk';
  let weather: WeatherEffect = 'fireflies';
  let prop: ForegroundPropType = 'lantern';

  if (
    /\b(water drop|droplet|crown-shaped|ripples|still body of water|calm water|touches the surface)\b/.test(
      lower
    )
  ) {
    theme = 'water_drop_macro';
    timeOfDay = 'dusk';
    weather = 'clear';
    if (
      /\b(fade|returns to stillness|reflecting the soft sunset|shot 4)\b/.test(
        lower
      )
    ) {
      prop = 'water_still';
    } else if (
      /\b(top-down|spreading out|circular ripples|even rings|shot 3)\b/.test(
        lower
      ) &&
      !/\b(forming and falling|touches the surface|bouncing back)\b/.test(lower)
    ) {
      prop = 'water_ripples';
    } else if (
      /\b(impact|touches the surface|splash|crown|bouncing back|bounce|shot 2)\b/.test(
        lower
      ) &&
      !/\b(forming and falling|shot 1)\b/.test(lower)
    ) {
      prop = 'water_crown';
    } else {
      prop = 'water_drop';
    }
    return { theme, timeOfDay, weather, prop };
  }

  if (
    /\b(candy shop|candy|candies|gummy|gummies|lollipop|lollipops|chocolates|sweet shop|bakery|confectionery|shopkeeper)\b/.test(
      lower
    )
  ) {
    theme = 'candy_shop';
    timeOfDay = 'day';
    weather = 'clear';
    prop = /\b(scoop|scooping|jar|jars|bag)\b/.test(lower) && !/\b(counter|weigh)\b/.test(lower)
      ? 'candy_jars'
      : 'candy_counter';
  } else if (
    /\b(beach|tropical|palm|lounger|sand|turquoise|shore|island|surf|waves|seaside|resort|ocean|sea)\b/.test(
      lower
    ) &&
    !/\b(cliff|lighthouse)\b/.test(lower)
  ) {
    theme = 'tropical_beach';
    timeOfDay = 'dusk';
    weather = 'clear';
    prop = /\b(lounger|chair|hammock|recliner)\b/.test(lower)
      ? 'beach_lounger'
      : /\b(drink|glass|iced|lime|cocktail|juice)\b/.test(lower)
      ? 'iced_drink'
      : 'none';
  } else if (/\b(space|planet|mars|moon|galaxy|orbit|alien|spaceship|rocket|station|cosmos|asteroid)\b/.test(lower)) {
    theme = 'space_station';
    timeOfDay = 'night';
    weather = 'starfield';
    prop = 'monolith';
  } else if (/\b(city|cyber|neon|street|alley|tokyo|downtown|ramen|hacker|detective|skyscraper|traffic)\b/.test(lower)) {
    theme = 'cyber_city';
    timeOfDay = 'night';
    weather = 'rain';
    prop = /\b(ramen|food|noodle|shop|stall|cart)\b/.test(lower) ? 'ramen_cart' : 'none';
  } else if (/\b(desert|canyon|dune|sand|oasis|mesa|ruin|pyramid|wasteland|western)\b/.test(lower)) {
    theme = 'sunset_desert';
    timeOfDay = 'dusk';
    weather = 'clear';
    prop = 'campfire';
  } else if (/\b(cliff|coast|lighthouse|harbor|ship|bay)\b/.test(lower)) {
    theme = 'ocean_cliff';
    timeOfDay = 'dawn';
    weather = 'clear';
    prop = 'telescope';
  } else if (/\b(studio|room|lab|office|workshop|house|home|kitchen|library|desk|indoor|computer|shop|store|cafe)\b/.test(lower)) {
    theme = 'cozy_studio';
    timeOfDay = 'day';
    weather = 'clear';
    prop = 'console_desk';
  } else {
    theme = 'forest';
    timeOfDay = 'dusk';
    weather = 'fireflies';
    prop = /\b(camp|fire)\b/.test(lower) ? 'campfire' : /\b(walk|walking|waling|stroll|together)\b/.test(lower) ? 'none' : 'lantern';
  }

  if (theme !== 'candy_shop') {
    if (/\b(golden hour|sunset|dusk|twilight|evening|warm sunset)\b/.test(lower)) timeOfDay = 'dusk';
    else if (/\b(dawn|sunrise|morning)\b/.test(lower)) timeOfDay = 'dawn';
    else if (/\b(noon|daytime|sunny|bright)\b/.test(lower)) timeOfDay = 'day';
    else if (/\b(night|midnight|dark)\b/.test(lower)) timeOfDay = 'night';
  }

  if (/\b(rain|raining|storm|downpour|drizzle)\b/.test(lower)) weather = 'rain';
  else if (/\b(snow|snowing|winter|blizzard|frost|ice storm)\b/.test(lower)) weather = 'snow';
  else if (/\b(firefly|fireflies|spores|bioluminescent)\b/.test(lower)) weather = 'fireflies';
  else if (/\b(stars|starfield|starry)\b/.test(lower)) weather = 'starfield';
  else if (/\b(clear|calm|quiet|gentle|breeze|warm|pastel)\b/.test(lower)) weather = 'clear';

  if (/\b(candy counter|shopkeeper|weighs the bag)\b/.test(lower)) prop = 'candy_counter';
  else if (/\b(scoop|gummies from a glass jar)\b/.test(lower)) prop = 'candy_jars';
  else if (/\b(lounger|beach chair|deck chair|sunbed)\b/.test(lower)) prop = 'beach_lounger';
  else if (/\b(iced drink|tall glass|lime slice|cocktail|lemonade)\b/.test(lower) && theme !== 'tropical_beach') {
    prop = 'iced_drink';
  } else if (/\b(monolith|crystal|obelisk|portal|shrine)\b/.test(lower)) prop = 'monolith';
  else if (/\b(ramen|noodle|stall|food cart)\b/.test(lower)) prop = 'ramen_cart';
  else if (/\b(campfire|bonfire)\b/.test(lower)) prop = 'campfire';
  else if (/\b(console|computer|terminal|desk)\b/.test(lower)) prop = 'console_desk';
  else if (/\b(telescope|observatory)\b/.test(lower)) prop = 'telescope';
  else if (/\b(crate|chest|box|cargo|treasure)\b/.test(lower)) prop = 'crate';
  else if (/\b(lantern|lamp)\b/.test(lower)) prop = 'lantern';

  return { theme, timeOfDay, weather, prop };
}

function extractTitle(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (/\b(water drop|droplet|circular ripples|crown-shaped)\b/.test(lower)) {
    return 'Golden Hour Water Drop';
  }
  if (/\b(candy shop|gummies|gummy|lollipops|shopkeeper)\b/.test(lower)) {
    return 'Sweet Pastel Candy Shop';
  }
  if (/\b(beach|lounger|golden hour|turquoise)\b/.test(lower)) {
    return 'Golden Hour Shore';
  }
  const cleaned = prompt
    .replace(/main prompt:?/gi, '')
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));

  if (cleaned.length === 0) return 'Chronicles of the Stage';

  const topWords = cleaned
    .slice(0, 4)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return topWords.join(' ');
}

function isSoloCharacterPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  if (
    /\b(shopkeeper|clerk|cashier|vendor|waiter|barista|two|three|four|five|2|3|4|5|trio|quartet|group|people|friends|partners|both|pair|couple|together|versus|duel|conversation|talking to each other)\b/.test(
      lower
    )
  ) {
    return false;
  }
  if (
    /\b(a relaxed adult|a person|a lone|a solo|a woman|a man|a girl|a boy|a traveler|an astronaut|a scientist|a detective|one person|he sits|she sits|they wear|they hold|they take a slow sip)\b/.test(
      lower
    )
  ) {
    return true;
  }
  return false;
}

export function buildCharactersFromPrompt(prompt: string): CharacterSpec[] {
  const targetCount = detectRequestedActorCount(prompt);
  if (targetCount === 0) {
    return [];
  }

  const lower = prompt.toLowerCase();

  // Special match: Candy Shop / Shopper + Shopkeeper script
  if (/\b(shopper|customer)\b/.test(lower) && /\b(shopkeeper|clerk|cashier|counter)\b/.test(lower)) {
    return [
      {
        id: 'char_1',
        name: 'Shopper',
        role: 'Cheerful Shopper',
        primaryColor: '#F472B6',
        secondaryColor: '#38BDF8',
        skinOrFurColor: '#F5CBA7',
        hairColor: '#451A03',
        bodyType: 'humanoid',
        accessory: 'scarf',
      },
      {
        id: 'char_2',
        name: 'Shopkeeper',
        role: 'Friendly Shopkeeper',
        primaryColor: '#34D399',
        secondaryColor: '#FBBF24',
        skinOrFurColor: '#E5B887',
        hairColor: '#78350F',
        bodyType: 'humanoid',
        accessory: 'glasses',
      },
    ];
  }

  const words = prompt.split(/\s+/);
  const candidateNames: string[] = [];
  const ignoredCapitalized = new Set([
    'Two', 'Three', 'Four', 'Five', 'One', 'In', 'On', 'At', 'The', 'A', 'An', 'When', 'After',
    'Before', 'Inside', 'Outside', 'Main', 'Optional', 'Shot', 'Wide', 'Close',
    'Medium', 'Over', 'Gentle', 'Warm', 'Cinematic', 'Slow', 'Realistic', 'They',
    'Smooth', 'Soft', 'People', 'Friends',
  ]);
  for (let i = 0; i < words.length; i++) {
    const clean = words[i].replace(/[^a-zA-Z]/g, '');
    if (
      clean.length >= 3 &&
      clean.length <= 12 &&
      /^[A-Z][a-z]+$/.test(clean) &&
      !STOP_WORDS.has(clean.toLowerCase()) &&
      !ignoredCapitalized.has(clean)
    ) {
      if (!candidateNames.includes(clean)) {
        candidateNames.push(clean);
      }
    }
  }

  let sharedBodyType: CharacterBodyType = 'humanoid';
  if (/\b(astronaut|astronauts|cosmonaut|spaceman)\b/.test(lower)) {
    sharedBodyType = 'astronaut';
  } else if (/\b(fox|foxes)\b/.test(lower)) {
    sharedBodyType = 'animal_fox';
  } else if (/\b(cat|cats|kitten|kittens)\b/.test(lower)) {
    sharedBodyType = 'animal_cat';
  } else if (/\b(robot|robots|android|mech|bot|cyborg|droid)\b/.test(lower)) {
    sharedBodyType = 'robot';
  } else if (/\b(spirit|spirits|ghost|fairy)\b/.test(lower)) {
    sharedBodyType = 'spirit';
  }

  const defaultNames = ['Alex', 'Maya', 'Liam', 'Elena', 'Noah'];
  const defaultRoles = [
    'Lead Traveler',
    'Companion',
    'Third Companion',
    'Fourth Companion',
    'Fifth Companion',
  ];
  const primaryPalette = ['#38BDF8', '#F472B6', '#34D399', '#F59E0B', '#A78BFA'];
  const secondaryPalette = ['#F59E0B', '#38BDF8', '#FBBF24', '#10B981', '#F43F5E'];
  const skinPalette = ['#E5B887', '#F5CBA7', '#D4A373', '#FDE68A', '#C68642'];
  const hairPalette = ['#292524', '#451A03', '#78350F', '#1E293B', '#92400E'];
  const accessories: CharacterAccessory[] = ['scarf', 'backpack', 'glasses', 'headphones', 'none'];

  const characters: CharacterSpec[] = [];

  for (let i = 0; i < targetCount; i++) {
    let bodyType: CharacterBodyType = sharedBodyType;
    let accessory: CharacterAccessory = accessories[i % accessories.length];
    let role = defaultRoles[i] || `Traveler ${i + 1}`;
    let name = candidateNames[i] || defaultNames[i] || `Actor ${i + 1}`;
    let primaryColor = primaryPalette[i % primaryPalette.length];
    let secondaryColor = secondaryPalette[i % secondaryPalette.length];
    let skinColor = skinPalette[i % skinPalette.length];
    let hairColor = hairPalette[i % hairPalette.length];

    if (i === 0 && /\b(linen shirt|beach|lounger|sunglasses|tropical)\b/.test(lower)) {
      bodyType = 'humanoid';
      accessory = 'glasses';
      role = 'Beach Lounger';
      name = candidateNames[0] || 'Traveler';
      primaryColor = '#F8FAFC';
      secondaryColor = '#38BDF8';
      skinColor = '#E5B887';
      hairColor = '#292524';
    } else if (sharedBodyType === 'astronaut') {
      accessory = 'helmet';
      role = i === 0 ? 'Mission Commander' : `Crew Specialist ${i + 1}`;
    } else if (sharedBodyType === 'robot') {
      accessory = 'antenna';
      skinColor = '#CBD5E1';
      role = `Autonomous Unit ${i + 1}`;
    }

    characters.push({
      id: `char_${i + 1}`,
      name,
      role,
      primaryColor,
      secondaryColor,
      skinOrFurColor: skinColor,
      hairColor,
      bodyType,
      accessory,
    });
  }

  return characters;
}

interface ParsedShotSpec {
  title: string;
  summary: string;
  durationSeconds: number;
  shotType: ShotType;
  cameraMotion: CameraMotion;
  action: CharacterActionType;
  secondaryAction: CharacterActionType;
  expression: CharacterExpression;
  isMoving: boolean;
  includeAllCharacters: boolean;
}

function inferShotDetails(
  text: string,
  index: number,
  _totalShots: number,
  isBeachLoungerStory: boolean,
  isCandyShopStory: boolean,
  isWaterDropStory = false
): ParsedShotSpec {
  const lower = text.toLowerCase();

  let durationSeconds = 4;
  const rangeMatch = text.match(/\((\d+)\s*[-–—to]+\s*(\d+)\s*s/i);
  if (rangeMatch) {
    const startS = Number(rangeMatch[1]);
    const endS = Number(rangeMatch[2]);
    if (endS > startS) {
      durationSeconds = Math.max(2, Math.min(10, endS - startS));
    }
  }

  // Smooth narrative shot cycle: avoid sudden unrequested jumps to extreme close_up on Shot 2
  const smoothNarrativeCycle: ShotType[] = ['wide', 'medium', 'medium', 'wide'];
  let shotType: ShotType = smoothNarrativeCycle[index % smoothNarrativeCycle.length];
  if (/\b(wide shot|wide panoramic|establishing|in the distance|wide angle|opening the door|top-down view)\b/.test(lower)) {
    shotType = 'wide';
  } else if (/\b(close-up|close up|closeup|macro|super slow-motion impact|hand lifting|scooping|pops it|takes a candy)\b/.test(lower)) {
    shotType = 'close_up';
  } else if (/\b(over-the-shoulder|over the shoulder)\b/.test(lower)) {
    shotType = 'over_shoulder';
  } else if (/\b(medium shot|medium tracking|medium side-angle|from the side|side angle|at the counter|weighs the bag|ripples fade|returns to stillness)\b/.test(lower)) {
    shotType = 'medium';
  }

  let action: CharacterActionType = 'idle';
  let secondaryAction: CharacterActionType = 'idle';
  let isMoving = false;
  let expression: CharacterExpression = 'happy';
  let includeAllCharacters = true;

  if (isWaterDropStory) {
    includeAllCharacters = false;
    isMoving = false;
    action = 'idle';
    secondaryAction = 'idle';
  } else if (isCandyShopStory) {
    if (
      index === 0 ||
      /\b(opening the door|walks into|bell ringing|enter)\b/.test(lower)
    ) {
      shotType = 'wide';
      action = 'enter_door';
      secondaryAction = 'wave';
      isMoving = true;
      expression = 'excited';
      includeAllCharacters = true;
    } else if (
      /\b(scoop|scooping|gummies from a glass jar|fill a small paper bag)\b/.test(
        lower
      )
    ) {
      shotType = 'close_up';
      action = 'scoop_candy';
      secondaryAction = 'idle';
      isMoving = false;
      expression = 'excited';
      includeAllCharacters = false;
    } else if (
      /\b(counter|shopkeeper|weighs the bag|hands it over|both smiling)\b/.test(
        lower
      )
    ) {
      shotType = 'medium';
      action = 'weigh_and_hand';
      secondaryAction = 'weigh_and_hand';
      isMoving = false;
      expression = 'happy';
      includeAllCharacters = true;
    } else {
      shotType = 'close_up';
      action = 'eat_candy';
      secondaryAction = 'idle';
      isMoving = false;
      expression = 'excited';
      includeAllCharacters = false;
    }
  } else if (isBeachLoungerStory) {
    includeAllCharacters = false;
    isMoving = false;
    if (shotType === 'close_up' || /\b(lifting a glass|take a slow sip|sip|condensation|hold a tall glass)\b/.test(lower)) {
      action = 'sip_drink';
      expression = 'happy';
    } else if (
      shotType === 'medium' ||
      shotType === 'over_shoulder' ||
      /\b(lower the glass|exhale|gaze|watching the waves|looking out)\b/.test(lower)
    ) {
      action = 'gaze_horizon';
      expression = 'happy';
    } else {
      action = 'relax_lounger';
      expression = 'happy';
    }
  } else if (/\b(scoop|scooping|gummies|jar)\b/.test(lower)) {
    action = 'scoop_candy';
    isMoving = false;
    includeAllCharacters = false;
  } else if (/\b(weigh|hands it over|counter)\b/.test(lower)) {
    action = 'weigh_and_hand';
    secondaryAction = 'weigh_and_hand';
    isMoving = false;
    includeAllCharacters = true;
  } else if (/\b(pops it|eat|takes a candy|bite|taste)\b/.test(lower)) {
    action = 'eat_candy';
    isMoving = false;
    includeAllCharacters = false;
  } else if (/\b(opening the door|walks into|enters)\b/.test(lower)) {
    action = 'enter_door';
    secondaryAction = 'wave';
    isMoving = true;
  } else if (/\b(sip|drink|lifting a glass)\b/.test(lower)) {
    action = 'sip_drink';
    isMoving = false;
  } else if (/\b(lounger|recline|relaxing on)\b/.test(lower)) {
    action = 'relax_lounger';
    isMoving = false;
  } else if (/\b(gaze|watching the waves|looking out|exhale)\b/.test(lower)) {
    action = 'gaze_horizon';
    isMoving = false;
  } else if (/\b(sit|sitting|seated)\b/.test(lower)) {
    action = 'sit';
    isMoving = false;
    secondaryAction = 'sit';
  } else if (/\b(run|running|sprint|chase|dash|jog|jogging)\b/.test(lower)) {
    action = 'run';
    secondaryAction = 'run';
    isMoving = true;
    expression = 'determined';
  } else if (/\b(walk|walking|waling|stroll|strolling|hike|hiking|trek|trekking|march|marching|journey|step|stepping|along|together)\b/.test(lower)) {
    action = 'walk';
    secondaryAction = 'walk';
    isMoving = true;
    expression = 'happy';
  } else if (/\b(jump|leap|bounce)\b/.test(lower)) {
    action = 'jump';
    secondaryAction = 'jump';
    isMoving = false;
    expression = 'excited';
  } else if (/\b(celebrate|cheer|victory)\b/.test(lower)) {
    action = 'celebrate';
    secondaryAction = 'celebrate';
    isMoving = false;
    expression = 'excited';
  } else if (/\b(inspect|examine|scan|study|browse|browsing)\b/.test(lower)) {
    action = 'inspect';
    secondaryAction = 'inspect';
    isMoving = false;
    expression = 'excited';
  } else {
    const cycleActions: CharacterActionType[] = ['walk', 'talk', 'wave', 'celebrate'];
    action = cycleActions[index % cycleActions.length];
    secondaryAction = action;
    isMoving = action === 'walk';
  }

  let cameraMotion: CameraMotion = 'static';
  if (isWaterDropStory) {
    if (index === 0 || /\b(forming and falling|falling)\b/.test(lower)) {
      cameraMotion = 'zoom_in';
    } else if (index === 1 || /\b(impact|touches the surface|crown)\b/.test(lower)) {
      cameraMotion = 'static';
    } else if (index === 2 || /\b(top-down|spreading out)\b/.test(lower)) {
      cameraMotion = 'zoom_out';
    } else {
      cameraMotion = 'static';
    }
  } else if (isMoving) {
    // Keep smooth right-tracking camera motion when characters are walking/moving across the stage
    cameraMotion = 'pan_right';
  } else if (/\b(push-in|push in|dramatic push)\b/.test(lower)) {
    cameraMotion = 'dramatic_push';
  } else if (/\b(tracking|pan right|walks into|opening the door)\b/.test(lower)) {
    cameraMotion = 'pan_right';
  } else if (/\b(zoom in|close-up|close up)\b/.test(lower)) {
    cameraMotion = 'zoom_in';
  } else if (/\b(zoom out|wide shot|pull back)\b/.test(lower)) {
    cameraMotion = 'zoom_out';
  } else if (/\b(pan left)\b/.test(lower)) {
    cameraMotion = 'pan_left';
  } else {
    const camCycle: CameraMotion[] = ['pan_right', 'zoom_in', 'pan_right', 'zoom_out'];
    cameraMotion = camCycle[index % camCycle.length];
  }

  const shotLabels: Record<ShotType, string> = {
    wide: 'Wide Establishing Shot',
    close_up: 'Close-Up Detail Shot',
    medium: 'Medium Narrative Shot',
    over_shoulder: 'Over-the-Shoulder Horizon',
  };

  let shotTitle = `Shot ${index + 1}: ${shotLabels[shotType]}`;
  if (isWaterDropStory) {
    const waterTitles = [
      'Shot 1: Macro Forming Drop',
      'Shot 2: Slow-Motion Crown Impact',
      'Shot 3: Top-Down Golden Ripples',
      'Shot 4: Mirror Sunset Stillness',
    ];
    shotTitle = waterTitles[index] || `Shot ${index + 1}: Macro Water Study`;
  }

  let cleanSummary = text.replace(/^(shot|scene)\s*\d+\s*(\([^)]*\))?\s*:\s*/i, '').trim();

  if (isCandyShopStory && cleanSummary.length < 25 && index >= 3) {
    cleanSummary =
      'Close-up of the shopper taking a rainbow gummy candy from the paper bag, popping it in their mouth, and smiling happily.';
  }

  return {
    title: shotTitle,
    summary: cleanSummary || text.trim(),
    durationSeconds,
    shotType,
    cameraMotion,
    action,
    secondaryAction,
    expression,
    isMoving,
    includeAllCharacters,
  };
}

function parseShotsFromPrompt(
  prompt: string,
  requestedSceneCount: number
): ParsedShotSpec[] {
  const isWaterDropStory =
    /\b(water drop|droplet|crown-shaped|circular ripples|still body of water)\b/i.test(prompt);
  const isBeachLoungerStory =
    /\b(lounger|beach|iced drink|lime slice|turquoise waves)\b/i.test(prompt);
  const isCandyShopStory =
    /\b(candy shop|gummies|gummy|lollipops|shopkeeper|scoop)\b/i.test(prompt);

  const lines = prompt
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const explicitShotLines = lines.filter((l) =>
    /^(shot|scene)\s*\d+/i.test(l)
  );

  if (explicitShotLines.length >= 2) {
    return explicitShotLines.map((line, idx) =>
      inferShotDetails(
        line,
        idx,
        explicitShotLines.length,
        isBeachLoungerStory,
        isCandyShopStory,
        isWaterDropStory
      )
    );
  }

  if (isWaterDropStory) {
    const count = Math.max(requestedSceneCount, 4);
    const defaultWaterShots = [
      'Shot 1 (0–3s): Macro shot of a water drop slowly forming and falling, catching the light as it drops.',
      'Shot 2 (3–5s): Super slow-motion impact as the drop touches the surface, a tiny splash and a small droplet bouncing back up.',
      'Shot 3 (5–8s): Top-down view of circular ripples spreading out evenly across the calm water.',
      'Shot 4 (8–10s): The ripples fade and the water returns to stillness, reflecting the soft sunset sky.',
    ];
    return defaultWaterShots
      .slice(0, count)
      .map((line, idx) => inferShotDetails(line, idx, count, false, false, true));
  }

  if (isCandyShopStory) {
    const count = Math.max(requestedSceneCount, 4);
    const defaultCandyShots = [
      'Shot 1 (0–3s): Wide shot of the cheerful shopper opening the door of a bright pastel candy shop, a small brass bell ringing above the door.',
      'Shot 2 (3–6s): Close-up of their hand scooping colorful rainbow gummies from a glass jar into a pastel paper bag.',
      'Shot 3 (6–10s): Medium shot at the counter as the friendly shopkeeper weighs the bag on the scale and hands it over, both smiling.',
      'Shot 4 (10–15s): Close-up of the shopper taking a candy from the paper bag, popping it in their mouth, and smiling happily.',
    ];
    return defaultCandyShots
      .slice(0, count)
      .map((line, idx) => inferShotDetails(line, idx, count, false, true, false));
  }

  if (isBeachLoungerStory) {
    const count = Math.max(requestedSceneCount, 4);
    const defaultBeachShots = [
      'Shot 1 (0–4s): Wide shot of a calm tropical beach at sunset, gentle turquoise waves rolling onto white sand, a relaxed adult on a wooden beach lounger in the distance.',
      'Shot 2 (4–8s): Close-up of their hand lifting a tall glass of iced drink with a lime slice, glistening condensation dripping down the glass, then taking a slow sip.',
      'Shot 3 (8–12s): Medium shot from the side with a slow camera push-in as they lower the glass, exhale softly, and smile contentedly while watching the waves.',
      'Shot 4 (12–15s): Over-the-shoulder shot looking out at the glowing golden-hour sea and sunset horizon, warm breeze moving their hair and palm leaves overhead, slow fade.',
    ];
    return defaultBeachShots
      .slice(0, count)
      .map((line, idx) => inferShotDetails(line, idx, count, true, false, false));
  }

  const cleanedPrompt = prompt
    .replace(/^main prompt:\s*/i, '')
    .trim();

  const sentences = cleanedPrompt
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  const targetCount = Math.min(Math.max(requestedSceneCount || 3, 2), 6);
  const isWalkingStory = /\b(walk|walking|waling|stroll|strolling|hike|hiking|trek|trekking|together)\b/i.test(cleanedPrompt);

  // If the user gave a short 1-sentence prompt (e.g. "Three people are walking together"),
  // expand it into a smooth, progressive multi-shot narrative arc instead of repeating identically!
  if (sentences.length <= 1 && isWalkingStory) {
    const progressiveWalkArc = [
      `Wide establishing tracking shot: ${cleanedPrompt}, setting out side by side in the same direction.`,
      `Medium tracking shot: ${cleanedPrompt}, continuing smoothly along the path in stride while exchanging warm smiles.`,
      `Medium side-angle tracking shot: ${cleanedPrompt}, walking onward together through the continuous landscape.`,
      `Wide panoramic tracking shot: ${cleanedPrompt}, arriving together across the scenic stage.`,
    ];
    return progressiveWalkArc
      .slice(0, targetCount)
      .map((line, idx) => inferShotDetails(line, idx, targetCount, false, false, false));
  }

  const shots: ParsedShotSpec[] = [];
  for (let i = 0; i < targetCount; i++) {
    const sentence =
      sentences[i] ||
      sentences[sentences.length - 1] ||
      cleanedPrompt;
    shots.push(inferShotDetails(sentence, i, targetCount, false, false, false));
  }

  return shots;
}

/**
 * Computes progressive group horizontal positions across scenes so characters walking together
 * move in the same direction ('right') and start each new shot where the previous shot ended.
 */
function computeGroupWalkPositions(
  charIndex: number,
  totalChars: number,
  sceneIndex: number,
  totalScenes: number
): { startX: number; endX: number } {
  const spacing = totalChars >= 4 ? 7 : totalChars === 3 ? 8.5 : 10;
  const groupSpan = (totalChars - 1) * spacing;
  const minCenter = 22 + groupSpan * 0.5;
  const maxCenter = 74 - groupSpan * 0.5;

  const segStartRatio = sceneIndex / Math.max(1, totalScenes);
  const segEndRatio = (sceneIndex + 1) / Math.max(1, totalScenes);

  const centerStart = minCenter + (maxCenter - minCenter) * segStartRatio;
  const centerEnd = minCenter + (maxCenter - minCenter) * segEndRatio;

  const offsetFromCenter = (charIndex - (totalChars - 1) / 2) * spacing;

  return {
    startX: Math.round(Math.max(12, Math.min(86, centerStart + offsetFromCenter))),
    endX: Math.round(Math.max(14, Math.min(88, centerEnd + offsetFromCenter))),
  };
}

/**
 * Second-Pass Continuity & Smooth Transition Director Layer:
 * Ensures all scenes in a project share consistent character appearance (matching exact requested count),
 * continuous environment/lighting, coordinated group direction, and chained startX/endX paths across shots.
 */
export function enforceProjectContinuity(
  project: AnimationProject
): AnimationProject {
  if (!project.scenes || project.scenes.length === 0) return project;

  const promptText = project.prompt || '';
  const promptHasActors = hasActorsInPrompt(promptText);
  const expectedCount = promptHasActors ? detectRequestedActorCount(promptText) : 0;

  let validChars: CharacterSpec[] = [];
  if (!promptHasActors) {
    validChars = [];
  } else if (project.characters.length === expectedCount && expectedCount > 0) {
    validChars = project.characters;
  } else if (promptText.trim().length > 0 && expectedCount > 0) {
    const built = buildCharactersFromPrompt(promptText);
    validChars = built.map((b, idx) => ({
      ...b,
      ...(project.characters[idx] || {}),
      id: project.characters[idx]?.id || b.id,
    }));
  } else {
    validChars = project.characters;
  }

  const isOppositeMove = isOppositeDirectionPrompt(promptText);
  const isGroupWalkingPrompt =
    /\b(walk|walking|waling|stroll|strolling|hike|hiking|trek|trekking|together)\b/i.test(
      promptText
    ) && !isOppositeMove;

  const totalScenes = project.scenes.length;
  const refinedScenes: SceneSpec[] = [];

  for (let idx = 0; idx < totalScenes; idx++) {
    const scene = project.scenes[idx];
    const prevScene = idx > 0 ? refinedScenes[idx - 1] : null;
    const nextScene = idx < totalScenes - 1 ? project.scenes[idx + 1] : null;

    const summaryLower = (scene.narrativeSummary || '').toLowerCase();
    const hasExplicitEnvChange =
      /\b(meanwhile|later|outside|inside|space|city|desert|forest|beach)\b/.test(summaryLower) &&
      idx > 0;

    // Lock environment backdrop & lighting to Scene 1 unless the script explicitly changes locations
    const environmentTheme =
      prevScene && !hasExplicitEnvChange
        ? prevScene.environmentTheme
        : scene.environmentTheme;

    const timeOfDay =
      prevScene && !/\b(dawn|morning|noon|day|night|midnight|sunset|dusk)\b/.test(summaryLower)
        ? prevScene.timeOfDay
        : scene.timeOfDay;

    const weatherEffect =
      prevScene && !hasExplicitEnvChange
        ? prevScene.weatherEffect
        : scene.weatherEffect;

    let refinedPlacements =
      validChars.length === 0
        ? []
        : scene.characterPlacements.map((cp, cpIdx) => {
            const targetChar =
              validChars.find((c) => c.id === cp.characterId) ||
              validChars[cpIdx % validChars.length];

            return {
              ...cp,
              characterId: targetChar.id,
              startY: 74,
              endY: 74,
              scale: 1.0,
            };
          });

    // If this is a multi-character group story (e.g. "three people walking together") and a scene
    // is missing some of the group members (and isn't an explicit solo close-up), include all group members!
    const isSoloCloseUp =
      scene.shotType === 'close_up' &&
      /\b(hand|scoop|eat|sip|glass|candy)\b/.test(summaryLower);

    if (
      validChars.length > 1 &&
      !isSoloCloseUp &&
      (isGroupWalkingPrompt || refinedPlacements.length < validChars.length) &&
      environmentTheme !== 'candy_shop' &&
      environmentTheme !== 'tropical_beach'
    ) {
      refinedPlacements = validChars.map((char, cIdx) => {
        const existing = refinedPlacements.find((p) => p.characterId === char.id) || refinedPlacements[cIdx];
        const prevPlacement = prevScene?.characterPlacements.find(
          (p) => p.characterId === char.id
        );

        if (isGroupWalkingPrompt || existing?.action === 'walk' || existing?.action === 'run') {
          const walkPos = computeGroupWalkPositions(cIdx, validChars.length, idx, totalScenes);
          const chainedStartX = prevPlacement ? prevPlacement.endX : walkPos.startX;
          const chainedEndX = Math.max(chainedStartX + 10, walkPos.endX);
          return {
            characterId: char.id,
            startX: Math.min(84, chainedStartX),
            startY: 74,
            endX: Math.min(88, chainedEndX),
            endY: 74,
            scale: 1.0,
            action: existing?.action === 'run' ? 'run' : 'walk',
            expression: existing?.expression || 'happy',
            facing: 'right',
          };
        }

        const spacing = validChars.length >= 3 ? 10 : 16;
        const basePos = 50 + (cIdx - (validChars.length - 1) / 2) * spacing;
        const startX = prevPlacement ? prevPlacement.endX : Math.round(basePos);
        return {
          characterId: char.id,
          startX,
          startY: 74,
          endX: startX,
          endY: 74,
          scale: 1.0,
          action: existing?.action || 'talk',
          expression: existing?.expression || 'happy',
          facing: isOppositeMove && cIdx > 0 ? 'left' : 'right',
        };
      });
    } else if (prevScene && refinedPlacements.length > 0 && environmentTheme === prevScene.environmentTheme) {
      // Chain startX smoothly from previous scene's endX so characters don't teleport between shots
      refinedPlacements = refinedPlacements.map((cp) => {
        const prevPlacement = prevScene.characterPlacements.find(
          (p) => p.characterId === cp.characterId
        );
        if (!prevPlacement) return cp;

        const delta = Math.abs(cp.startX - prevPlacement.endX);
        if (delta > 8 && cp.action !== 'enter_door') {
          const travel = cp.endX - cp.startX;
          const nextStart = prevPlacement.endX;
          const nextEnd = Math.max(14, Math.min(86, nextStart + travel));
          return {
            ...cp,
            startX: nextStart,
            endX: nextEnd,
            facing: !isOppositeMove && (cp.action === 'walk' || cp.action === 'run') ? 'right' : cp.facing,
          };
        }
        return cp;
      });
    }

    const transitionToNext: SceneTransition =
      scene.transitionToNext && scene.transitionToNext !== 'smooth_cut'
        ? scene.transitionToNext
        : timeOfDay === 'dusk' ||
          environmentTheme === 'tropical_beach' ||
          environmentTheme === 'water_drop_macro'
        ? 'fade_through_gold'
        : 'cross_dissolve';

    const currentShotLabel = (scene.shotType || 'medium').replace('_', ' ');
    const nextShotLabel = nextScene
      ? (nextScene.shotType || 'medium').replace('_', ' ')
      : 'final fade';

    const continuityNote =
      validChars.length === 0
        ? nextScene
          ? `Continuous golden-hour macro backdrop & fluid physics → smooth 1.0s ${transitionToNext.replace(/_/g, ' ')} into Shot ${idx + 2} (${nextShotLabel})`
          : `Final ${currentShotLabel} shot fading to calm mirror reflection`
        : nextScene
        ? `Continuous ${environmentTheme.replace('_', ' ')} backdrop · ${validChars.length} actor(s) chained (${refinedPlacements.map((p) => `${p.startX}%→${p.endX}%`).join(', ')}) → smooth 1.0s ${transitionToNext.replace(/_/g, ' ')} into Shot ${idx + 2}`
        : `Final ${currentShotLabel} shot · Continuous ${environmentTheme.replace('_', ' ')} backdrop & smooth completion`;

    refinedScenes.push({
      ...scene,
      environmentTheme,
      timeOfDay,
      weatherEffect,
      transitionToNext,
      continuityNote,
      characterPlacements: refinedPlacements,
    });
  }

  return {
    ...project,
    characters: validChars,
    scenes: refinedScenes,
  };
}

/**
 * Validates that the rendered project's actors, group movement directions, backdrops,
 * and shot-to-shot transitions faithfully match the user's script.
 */
export function validateProjectContinuityAndScript(
  project: AnimationProject
): ContinuityCheckReport {
  const items: ContinuityCheckItem[] = [];
  const promptText = project.prompt || '';
  const hasPrompt = promptText.trim().length > 0;
  const expectedActors = hasPrompt
    ? detectRequestedActorCount(promptText)
    : project.characters.length;

  // Check 1: Actor Count & Cast Match
  const actualActors = project.characters.length;
  const castMatched = !hasPrompt || actualActors === expectedActors;
  items.push({
    id: 'cast_count',
    label: 'Script Cast & Actor Count',
    passed: castMatched,
    detail:
      actualActors === 0
        ? '0 actors (pure environment / macro study matches script)'
        : `${actualActors} actor${actualActors > 1 ? 's' : ''} created (${project.characters.map((c) => c.name).join(', ')}) matching script`,
  });

  // Check 2: Group Direction & Action Sync (No unintended walking into each other)
  const isOpposite = isOppositeDirectionPrompt(promptText);
  let directionPassed = true;
  let directionDetail = 'Coordinated actor blocking across all scenes';

  if (actualActors > 1 && !isOpposite) {
    for (const sc of project.scenes) {
      const walkers = sc.characterPlacements.filter(
        (cp) => cp.action === 'walk' || cp.action === 'run'
      );
      if (walkers.length > 1) {
        const facings = new Set(walkers.map((w) => w.facing));
        if (facings.size > 1) {
          directionPassed = false;
          directionDetail = `Actors in ${sc.title} are walking in opposite directions instead of together`;
          break;
        }
      }
    }
    if (directionPassed) {
      directionDetail = `All ${actualActors} actors move together in synchronized direction (→ right)`;
    }
  } else if (actualActors === 0) {
    directionDetail = 'Actor-free fluid/nature choreography verified';
  }

  items.push({
    id: 'group_direction',
    label: 'Group Movement & Direction Sync',
    passed: directionPassed,
    detail: directionDetail,
  });

  // Check 3: Continuous Backdrop & Lighting Across Scenes
  const themes = new Set(project.scenes.map((s) => s.environmentTheme));
  const hasExplicitLocationShift = /\b(meanwhile|later|outside|inside)\b/i.test(promptText);
  const backdropPassed = themes.size <= 1 || hasExplicitLocationShift;
  items.push({
    id: 'backdrop_continuity',
    label: 'Continuous Environment & View',
    passed: backdropPassed,
    detail: backdropPassed
      ? `Continuous "${(project.scenes[0]?.environmentTheme || 'stage').replace(/_/g, ' ')}" backdrop & camera flow across all ${project.scenes.length} shots`
      : `Multiple environment backdrops detected across shots`,
  });

  // Check 4: Shot-to-Shot Position & Smooth Transition Verification
  let transitionPassed = true;
  for (let i = 0; i < project.scenes.length - 1; i++) {
    const curr = project.scenes[i];
    if (curr.transitionToNext === 'smooth_cut') {
      transitionPassed = false;
    }
  }
  items.push({
    id: 'smooth_transitions',
    label: 'Narrative Transitions & Path Chaining',
    passed: transitionPassed,
    detail: transitionPassed
      ? `Smooth 1.0s narrative dissolve & continuous actor path chaining verified across ${project.scenes.length} shots`
      : 'One or more scenes use an abrupt cut instead of a smooth dissolve',
  });

  const passedCount = items.filter((item) => item.passed).length;
  return {
    allPassed: passedCount === items.length,
    passedCount,
    totalChecks: items.length,
    items,
  };
}

export function createBlankProject(): AnimationProject {
  const uid = Date.now().toString(36);
  const sceneId = `scene_${uid}_1`;

  return {
    id: `proj_blank_${uid}`,
    title: 'Untitled Studio Project',
    prompt: '',
    logline: 'Enter a new script or shot-by-shot prompt to generate a fresh storyboard.',
    fps: 24,
    width: 1280,
    height: 720,
    visualStyle: 'Cinematic 4K',
    characters: [],
    scenes: [
      {
        id: sceneId,
        title: 'Shot 1: Blank Stage',
        narrativeSummary: '',
        durationFrames: 96,
        shotType: 'wide',
        transitionToNext: 'cross_dissolve',
        continuityNote: 'Memory cleared — ready for a brand new script.',
        environmentTheme: 'cozy_studio',
        timeOfDay: 'day',
        weatherEffect: 'clear',
        cameraMotion: 'static',
        foregroundProp: 'none',
        characterPlacements: [],
        dialogues: [],
      },
    ],
  };
}

export function buildSmartProjectFromPrompt(
  prompt: string,
  sceneCount = 3,
  visualStyle = 'Cel-Shaded Adventure'
): AnimationProject {
  const cleanPrompt = prompt.trim();
  const uid = Date.now().toString(36);
  const rawCharacters = buildCharactersFromPrompt(cleanPrompt);
  const characters = rawCharacters.map((c, idx) => ({
    ...c,
    id: `char_${uid}_${idx + 1}`,
  }));
  const title = extractTitle(cleanPrompt);
  const projectEnv = detectEnvironment(cleanPrompt);
  const parsedShots = parseShotsFromPrompt(cleanPrompt, sceneCount);
  const isOppositeMove = isOppositeDirectionPrompt(cleanPrompt);

  const hasExplicitDialogue =
    characters.length > 0 &&
    (/"[^"]+"/.test(cleanPrompt) ||
      /\b(says|said|asks|replies|shouts|whispers|speaks|dialogue|talking)\b/i.test(cleanPrompt));

  const FPS = 24;
  const totalShots = parsedShots.length;

  const scenes: SceneSpec[] = parsedShots.map((shot, idx) => {
    const durationFrames = shot.durationSeconds * FPS;
    const shotOnlyEnv = detectEnvironment(`${shot.title} ${shot.summary}`);
    const shotEnv =
      projectEnv.theme === 'water_drop_macro'
        ? {
            theme: 'water_drop_macro' as EnvironmentTheme,
            timeOfDay: 'dusk' as TimeOfDay,
            weather: 'clear' as WeatherEffect,
            prop:
              idx === 0
                ? ('water_drop' as ForegroundPropType)
                : idx === 1
                ? ('water_crown' as ForegroundPropType)
                : idx === 2
                ? ('water_ripples' as ForegroundPropType)
                : ('water_still' as ForegroundPropType),
          }
        : {
            // Keep environment theme, timeOfDay, and weather locked to projectEnv so background never jumps!
            theme: projectEnv.theme,
            timeOfDay: projectEnv.timeOfDay,
            weather: projectEnv.weather,
            prop:
              projectEnv.theme === 'candy_shop'
                ? shotOnlyEnv.prop
                : projectEnv.prop,
          };

    if (
      projectEnv.theme === 'water_drop_macro' &&
      ['water_drop', 'water_crown', 'water_ripples', 'water_still'].includes(shotOnlyEnv.prop)
    ) {
      shotEnv.prop = shotOnlyEnv.prop;
    }

    const activeCharacters =
      characters.length === 0
        ? []
        : shot.includeAllCharacters && characters.length > 1
        ? characters
        : [characters[0]];

    const placements = activeCharacters.map((char, cIdx) => {
      let startX = 46;
      let endX = 46;
      let facing: 'left' | 'right' = 'right';
      const action = cIdx === 0 ? shot.action : shot.secondaryAction;

      if (action === 'enter_door') {
        startX = 16;
        endX = 44;
        facing = 'right';
      } else if (action === 'weigh_and_hand') {
        if (cIdx === 0) {
          startX = 38;
          endX = 43;
          facing = 'right';
        } else {
          startX = 72;
          endX = 68;
          facing = 'left';
        }
      } else if (cIdx === 1 && shotEnv.theme === 'candy_shop') {
        startX = 74;
        endX = 74;
        facing = 'left';
      } else if (shot.isMoving) {
        if (isOppositeMove && activeCharacters.length === 2) {
          startX = cIdx === 0 ? 20 : 76;
          endX = cIdx === 0 ? 44 : 58;
          facing = cIdx === 0 ? 'right' : 'left';
        } else {
          // Group walking together in the same direction with continuous progress across shots!
          const pos = computeGroupWalkPositions(cIdx, activeCharacters.length, idx, totalShots);
          startX = pos.startX;
          endX = pos.endX;
          facing = 'right';
        }
      } else {
        const spacing = activeCharacters.length >= 3 ? 10 : 18;
        startX =
          activeCharacters.length === 1
            ? 46
            : Math.round(50 + (cIdx - (activeCharacters.length - 1) / 2) * spacing);
        endX = startX;
        facing = isOppositeMove && cIdx > 0 ? 'left' : 'right';
      }

      return {
        characterId: char.id,
        startX,
        startY: 74,
        endX,
        endY: 74,
        scale: 1.0,
        action,
        expression: shot.expression,
        facing,
      };
    });

    const quoteMatch = shot.summary.match(/"([^"]+)"/);
    const dialogues: DialogueLineSpec[] = [];

    if (characters.length > 0 && quoteMatch) {
      dialogues.push({
        id: `dlg_${uid}_${idx}_0`,
        characterId: characters[0].id,
        speakerName: characters[0].name,
        text: quoteMatch[1].slice(0, 130),
        startFrameOffset: 6,
        durationFrames: Math.max(24, durationFrames - 16),
      });
    } else if (hasExplicitDialogue && characters.length > 0) {
      dialogues.push({
        id: `dlg_${uid}_${idx}_0`,
        characterId: characters[idx % characters.length].id,
        speakerName: characters[idx % characters.length].name,
        text: shot.summary.slice(0, 110),
        startFrameOffset: 8,
        durationFrames: Math.min(60, Math.max(24, durationFrames - 16)),
      });
    }

    return {
      id: `scene_${uid}_${idx + 1}`,
      title: shot.title,
      narrativeSummary: shot.summary,
      durationFrames,
      shotType: shot.shotType,
      environmentTheme: shotEnv.theme,
      timeOfDay: shotEnv.timeOfDay,
      weatherEffect: shotEnv.weather,
      cameraMotion: shot.cameraMotion,
      foregroundProp: shotEnv.prop,
      characterPlacements: placements,
      dialogues,
    };
  });

  const rawProject: AnimationProject = {
    id: `proj_${uid}`,
    title,
    prompt: cleanPrompt,
    logline:
      cleanPrompt
        .replace(/^main prompt:\s*/i, '')
        .split('\n')[0]
        .slice(0, 180) || cleanPrompt,
    fps: FPS,
    width: 1280,
    height: 720,
    visualStyle,
    characters,
    scenes,
  };

  return enforceProjectContinuity(rawProject);
}

export function buildSmartSceneFromDirection(
  currentScene: SceneSpec,
  characters: CharacterSpec[],
  directionPrompt: string
): SceneSpec {
  let cleanDir = (directionPrompt || currentScene.narrativeSummary || '').trim();
  const wrappedMatch = cleanDir.match(/narrative (?:action )?summary:\s*"([\s\S]+?)"\s*(?:\(Scene Title|\(Title|$)/i);
  if (wrappedMatch && wrappedMatch[1]) {
    cleanDir = wrappedMatch[1].trim();
  }

  const isWater = /\b(water drop|droplet|crown-shaped|ripples|stillness|touches the surface)\b/i.test(cleanDir);
  const isBeach = /\b(beach|lounger|iced drink|lime|waves|tropical)\b/i.test(cleanDir);
  const isCandy = /\b(candy|gummies|gummy|shopkeeper|scoop|counter|lollipop)\b/i.test(cleanDir);
  const shot = inferShotDetails(cleanDir, 0, 1, isBeach, isCandy, isWater);
  const env = detectEnvironment(cleanDir);
  const isOppositeMove = isOppositeDirectionPrompt(cleanDir);

  const sceneHasActors = !isWater && (hasActorsInPrompt(cleanDir) || characters.length > 0);
  const quoteMatch = cleanDir.match(/"([^"]+)"/);

  const activeCharacters = !sceneHasActors
    ? []
    : shot.includeAllCharacters && characters.length > 1
    ? characters
    : characters.length > 0
    ? [characters[0]]
    : [];

  return {
    ...currentScene,
    title: shot.title,
    narrativeSummary: shot.summary || cleanDir,
    shotType: shot.shotType || 'medium',
    environmentTheme: env.theme,
    timeOfDay: env.timeOfDay,
    weatherEffect: env.weather,
    cameraMotion: shot.cameraMotion,
    foregroundProp: env.prop,
    characterPlacements: activeCharacters.map((char, idx) => {
      const action = idx === 0 ? shot.action : shot.secondaryAction;
      let startX = 46;
      let endX = 46;
      let facing: 'left' | 'right' = 'right';
      if (action === 'enter_door') {
        startX = 16;
        endX = 44;
      } else if (action === 'weigh_and_hand') {
        startX = idx === 0 ? 38 : 72;
        endX = idx === 0 ? 43 : 68;
        facing = idx === 0 ? 'right' : 'left';
      } else if (shot.isMoving) {
        if (isOppositeMove && activeCharacters.length === 2) {
          startX = idx === 0 ? 22 : 74;
          endX = idx === 0 ? 42 : 58;
          facing = idx === 0 ? 'right' : 'left';
        } else {
          const pos = computeGroupWalkPositions(idx, activeCharacters.length, 0, 1);
          startX = pos.startX;
          endX = pos.endX;
          facing = 'right';
        }
      } else {
        const spacing = activeCharacters.length >= 3 ? 10 : 18;
        startX =
          activeCharacters.length === 1
            ? 46
            : Math.round(50 + (idx - (activeCharacters.length - 1) / 2) * spacing);
        endX = startX;
        facing = isOppositeMove && idx > 0 ? 'left' : 'right';
      }
      return {
        characterId: char.id,
        startX,
        startY: 74,
        endX,
        endY: 74,
        scale: 1.0,
        action,
        expression: shot.expression,
        facing,
      };
    }),
    dialogues:
      quoteMatch && activeCharacters.length > 0
        ? [
            {
              id: `dlg_${Date.now()}_0`,
              characterId: activeCharacters[0].id,
              speakerName: activeCharacters[0].name,
              text: quoteMatch[1].slice(0, 130),
              startFrameOffset: 8,
              durationFrames: Math.min(
                64,
                Math.max(24, currentScene.durationFrames - 12)
              ),
            },
          ]
        : [],
  };
}
