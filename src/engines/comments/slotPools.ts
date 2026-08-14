/**
 * Slot value pools used to fill {placeholder} variables in comment templates.
 * Large, varied pools are what actually make the feed feel non-repetitive —
 * template count matters less than pool size, since every template renders
 * as (pool sizes multiplied together) distinct strings.
 */

export const NAMES: readonly string[] = [
  'xo_maya', 'DJ.Renegade', 'its_kevin22', 'lunaaa', 'thereal_marcus', 'sadgirl_hours',
  'yikes.tv', 'benny_boi', 'cosmic.kay', 'not_ur_average_jo', 'trashpanda99', 'zoe_does_stuff',
  'mvp.tyler', 'peachy_pri', 'grumpy_gus', 'nova_streams', 'chillwave_chris', 'itsmariposa',
  'kingjulian_', 'baby_shark_fan', 'the_o.g.sam', 'wanderlust_wren', 'noodle_arms', 'quietstorm22',
  'em_dashes', 'ghosted_by_u', 'plzclapforme', 'rainy_day_ronnie', 'sk8ordie', 'velvet.moon',
  'jvst_jordan', 'sillygoose77', 'unbotheredbea', 'crashtest_cody', 'honeybee.hana', 'lowkey_lex',
  'midwest_mia', 'feralcatlady', 'brb_snacks', 'toosoon_tobi', 'echo.chamber', 'nightowl_nia',
  'chronicallyonline', 'buttered_toast', '2am_thoughts', 'suspiciously_calm', 'yourfavcousin',
  'glitterbomb_gg', 'idk_ivy', 'realest_raul', 'main.character.mia', 'no_notes_nate',
  'perpetually_late', 'sundaybestsara', 'chaosgremlin', 'okboomer_ok', 'wifi_thief', 'blessed.beth',
  'donttalk2me', 'lurking_lana', 'firsttimehere_finn', 'been_here_since_day1',
];

export const EMOJI_POOLS = {
  hype: ['🔥', '🙌', '💯', '⚡', '🚀', '👏', '🥵', '🎉', '😤', '🏆'],
  love: ['❤️', '😍', '🥹', '💖', '🫶', '😘', '💗', '🥰'],
  funny: ['😭', '😂', '💀', '🤣', '😹', '🫠'],
  skeptic: ['🤨', '👀', '🙄', '🧐', '😬'],
  neutral: ['✨', '👋', '😊', '🤍', '🙂'],
} as const;

export const ALL_EMOJI: readonly string[] = Object.values(EMOJI_POOLS).flat();

export const COMPLIMENTS: readonly string[] = [
  'you look so good rn', 'the vibe is immaculate', 'this is actually so entertaining',
  'you have main character energy', 'your setup looks so clean', 'the lighting is perfect',
  'you seem like you’re having so much fun', 'this is exactly what I needed today',
  'you always know how to keep it interesting', 'the energy is unmatched today',
  'you’re so underrated fr', 'this feed is so cozy', 'you’re killing it today',
  'your voice is so soothing', 'this is giving main stage energy',
];

export const QUESTIONS: readonly string[] = [
  'wait is this your first live??', 'how long u been streaming', 'what time is it there rn',
  'are you gonna do this every day', 'can you say hi to my friend', 'is that your real hair color',
  'what app do you use for the filter', 'you doing a face reveal or nah', 'where are you rn',
  'you got a schedule for these', 'is the cam always this good or', 'you takin requests',
  'how do you even get this many people watching', 'you nervous or nah', 'first time catching u live, what’d I miss',
];

export const TIME_PHRASES: readonly string[] = [
  'literally just got here', 'been here since the start', 'popped in for a sec',
  'saw this pop up on my fyp', 'my phone randomly opened this lol', 'on my lunch break watching this',
  'supposed to be sleeping rn', 'watching this instead of studying', 'here for the whole thing',
  'just found this account',
];
