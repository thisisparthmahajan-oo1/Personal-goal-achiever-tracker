// Hardcoded 4-day beginner home workout plan. The plan structure is static
// reference content. Only per-exercise weights are persisted to Mongo via
// the exercise_weights collection — keyed by `exerciseKey`.

export type Movement = {
  name: string;
  cue: string;
};

export type Exercise = {
  key: string; // stable id used for weight tracking
  name: string;
  equipment: string;
  prescription: string; // "3 x 10" / "3 x 8/leg" / "3 x 20–40 s"
  rest: string;
  form: string;
  video: string;
};

export type Day = {
  slug: string;
  number: number;
  title: string; // "Back + Biceps"
  subtitle: string;
  warmup: Movement[];
  main: Exercise[];
  cooldown: Movement[];
};

export const GYM_PLAN: Day[] = [
  {
    slug: "day1",
    number: 1,
    title: "Back + Biceps",
    subtitle:
      "Lats, mid-back, rear delts, and biceps — all your pulling muscles.",
    warmup: [
      {
        name: "Seated band row (low anchor)",
        cue: "Sit on bench/floor facing the foot anchor, grab handles, pull to ribs squeezing shoulder blades — 2 × 15",
      },
      {
        name: "Band low-to-high face pull",
        cue: "Pull both handles up toward your face, elbows high — 15 reps",
      },
      { name: "Cat–cow", cue: "On mat, flow with breath — 8 reps" },
      {
        name: "Quadruped T-spine rotation",
        cue: "Hand behind head, rotate open — 8/side",
      },
      { name: "Arm swings + circles", cue: "Loosen shoulders — 10 each" },
    ],
    main: [
      {
        key: "day1-one-arm-db-row",
        name: "One-Arm Dumbbell Row",
        equipment: "Dumbbell, Bench",
        prescription: "3 × 10/arm",
        rest: "60–90 s",
        form:
          "Knee + hand on bench, flat back. Drive elbow to hip, squeeze, lower fully. No torso twisting.",
        video: "https://www.youtube.com/watch?v=EEFHHOCfHgw",
      },
      {
        key: "day1-bent-over-two-arm-row",
        name: "Bent-Over Two-Arm Row",
        equipment: "Dumbbells",
        prescription: "3 × 10",
        rest: "60–90 s",
        form:
          "Hinge at hips, flat back. Row both DBs to ribs, pause, lower slow.",
        video: "https://www.youtube.com/watch?v=6TSP1TRMUzs",
      },
      {
        key: "day1-db-pullover",
        name: "Dumbbell Pullover",
        equipment: "Dumbbell, Bench",
        prescription: "3 × 12",
        rest: "60 s",
        form:
          "Lie across/along bench, one DB over chest. Lower behind head with slight elbow bend; feel the lat stretch.",
        video: "https://www.youtube.com/watch?v=ZhPOEQJRzBU",
      },
      {
        key: "day1-db-reverse-fly",
        name: "Dumbbell Reverse Fly",
        equipment: "Dumbbells",
        prescription: "3 × 12",
        rest: "45 s",
        form:
          "Hinge forward, light DBs. Raise arms out to sides like wings; lead with elbows, don't shrug.",
        video: "https://www.youtube.com/watch?v=buuYPLVXsJg",
      },
      {
        key: "day1-db-bicep-curl",
        name: "Dumbbell Bicep Curl",
        equipment: "Dumbbells",
        prescription: "3 × 12",
        rest: "45 s",
        form: "Elbows pinned to sides, curl up, lower slow. No swinging.",
        video: "https://www.youtube.com/watch?v=yTWO2th-RIY",
      },
      {
        key: "day1-db-hammer-curl",
        name: "Dumbbell Hammer Curl",
        equipment: "Dumbbells",
        prescription: "3 × 12",
        rest: "45 s",
        form:
          "Neutral grip (palms face in). Curl without rotating; targets forearm + brachialis.",
        video: "https://www.youtube.com/watch?v=zC3nLlEvin4",
      },
    ],
    cooldown: [
      {
        name: "Band-assisted lat stretch (low anchor)",
        cue: "Kneel facing the anchor, hold handle, sit hips back and let the arm lengthen — 30 sec/side",
      },
      {
        name: "Child's pose with side reach",
        cue: "Walk hands to one side for lats — 30 sec/side",
      },
      {
        name: "Doorway / band biceps stretch",
        cue: "Arm extended back, palm out — 30 sec/side",
      },
      {
        name: "Cross-body shoulder stretch",
        cue: "Pull arm across chest — 30 sec/side",
      },
      { name: "Seated forward fold", cue: "Relax back + breathe — 45 sec" },
    ],
  },
  {
    slug: "day2",
    number: 2,
    title: "Chest + Triceps",
    subtitle: "Chest, front delts, and triceps — all your pushing muscles.",
    warmup: [
      {
        name: "Band low-to-high chest raise",
        cue: "Pull both handles up and across to chest height — 15 reps",
      },
      {
        name: "Band low row + external rotation",
        cue: "Light pulls from the low anchor to warm shoulders/rotator cuff — 15 reps",
      },
      {
        name: "Arm swings (horizontal hugs)",
        cue: "Open + cross the chest — 15 reps",
      },
      { name: "Wall slides", cue: "Back to wall, slide arms up/down — 10 reps" },
      {
        name: "Push-up to downward dog",
        cue: "Slow, mobilize shoulders — 8 reps",
      },
    ],
    main: [
      {
        key: "day2-db-bench-press",
        name: "Dumbbell Bench Press",
        equipment: "Dumbbells, Bench",
        prescription: "3 × 10",
        rest: "60–90 s",
        form:
          "DBs at chest, wrists over elbows. Press up to nearly straight, lower slow. ~45° elbow angle.",
        video: "https://www.youtube.com/watch?v=SHsUIZiNdeY",
      },
      {
        key: "day2-db-chest-fly",
        name: "Dumbbell Chest Fly",
        equipment: "Dumbbells, Bench",
        prescription: "3 × 12",
        rest: "60 s",
        form:
          "Slight elbow bend, open arms in an arc until chest stretch, squeeze back together. Don't bend elbows to press.",
        video: "https://www.youtube.com/watch?v=QENKPHhQVi4",
      },
      {
        key: "day2-incline-db-bench-press",
        name: "Incline Dumbbell Bench Press",
        equipment: "Dumbbells, Bench",
        prescription: "3 × 10",
        rest: "60 s",
        form:
          "Bench at 30–45°. DBs at shoulders, press up and slightly together, lower slow. Don't go too steep or it becomes a shoulder press.",
        video: "https://www.youtube.com/watch?v=sK4Rvug6ufo",
      },
      {
        key: "day2-close-grip-db-bench-press",
        name: "Close-Grip Dumbbell Bench Press (Crush Press)",
        equipment: "Dumbbells, Bench",
        prescription: "3 × 8–12",
        rest: "60 s",
        form:
          "Neutral grip (palms face each other). Press DBs together throughout the movement to lock elbows in close. Triceps-dominant.",
        video: "https://www.youtube.com/watch?v=ai38JOlGtZM",
      },
      {
        key: "day2-bench-tri-dip",
        name: "Bench Triceps Dip",
        equipment: "Bench",
        prescription: "3 × 10",
        rest: "45 s",
        form:
          "Hands on bench edge, feet on floor. Bend elbows back to lower, press up. Don't let shoulders shrug.",
        video: "https://www.youtube.com/watch?v=j_WpuVY3wbo",
      },
      {
        key: "day2-overhead-tri-ext",
        name: "Overhead Triceps Extension",
        equipment: "Dumbbell",
        prescription: "3 × 12",
        rest: "45 s",
        form:
          "One DB overhead, both hands. Lower behind head, elbows pointing up, then extend. Keep elbows still.",
        video: "https://www.youtube.com/watch?v=fYqswDVbJDg",
      },
    ],
    cooldown: [
      {
        name: "Band-assisted chest stretch (low anchor)",
        cue: "Hold handle behind you at hip height, open chest — 30 sec",
      },
      {
        name: "Doorway pec stretch (low + high)",
        cue: "Forearm on frame, lean through — 30 sec each",
      },
      {
        name: "Overhead triceps stretch",
        cue: "Elbow behind head, gentle pull — 30 sec/side",
      },
      { name: "Cross-body shoulder stretch", cue: "30 sec/side" },
      {
        name: "Cobra / upward stretch",
        cue: "Gentle chest + abs opener — 30 sec",
      },
    ],
  },
  {
    slug: "day3",
    number: 3,
    title: "Shoulders + Core",
    subtitle:
      "Deltoids (all three heads) plus a full core circuit — abs, obliques, and stabilizers.",
    warmup: [
      {
        name: "Seated band row (low anchor)",
        cue: "Same as Day 1 — pull to ribs squeezing shoulder blades — 2 × 15",
      },
      {
        name: "Band low-to-high lateral raise",
        cue: "Light tension, raise handles out to the sides — 12 reps",
      },
      { name: "Arm circles", cue: "Forward + backward — 10 each" },
      { name: "Wall slides", cue: "10 reps" },
      {
        name: "Dead bug (bodyweight)",
        cue: "Prep the core, slow + controlled — 8/side",
      },
    ],
    main: [
      {
        key: "day3-seated-db-shoulder-press",
        name: "Seated Dumbbell Shoulder Press",
        equipment: "Dumbbells, Bench",
        prescription: "3 × 10",
        rest: "60–90 s",
        form:
          "Sit tall, DBs at shoulders. Press overhead without locking hard; don't arch the lower back.",
        video: "https://www.youtube.com/watch?v=fuQpuu--bMI",
      },
      {
        key: "day3-arnold-press",
        name: "Dumbbell Arnold Press",
        equipment: "Dumbbells, Bench",
        prescription: "3 × 10",
        rest: "60 s",
        form:
          "Start palms facing you, rotate out as you press up. Hits all delt heads. Light weight to learn it.",
        video: "https://www.youtube.com/watch?v=3ml7BH7mNwQ",
      },
      {
        key: "day3-lateral-raise",
        name: "Dumbbell Lateral Raise",
        equipment: "Dumbbells",
        prescription: "3 × 12",
        rest: "45 s",
        form:
          "Soft elbows, raise out to sides to shoulder height. Lead with elbows, no swinging.",
        video: "https://www.youtube.com/watch?v=3VcKaXpzqRo",
      },
      {
        key: "day3-front-raise",
        name: "Dumbbell Front Raise",
        equipment: "Dumbbells",
        prescription: "3 × 12",
        rest: "45 s",
        form:
          "Slight elbow bend, raise to shoulder height in front, lower slow. Don't lean back.",
        video: "https://www.youtube.com/watch?v=T76xu0XjYTk",
      },
      {
        key: "day3-forearm-plank",
        name: "Forearm Plank",
        equipment: "Mat",
        prescription: "3 × 20–40 s",
        rest: "45 s",
        form:
          "Forearms down, straight line head-to-heels. Squeeze glutes + abs; don't sag or pike.",
        video: "https://www.youtube.com/watch?v=pSHjTRCQxIw",
      },
      {
        key: "day3-russian-twist",
        name: "Russian Twist",
        equipment: "Mat, Dumbbell",
        prescription: "3 × 10/side",
        rest: "45 s",
        form:
          "Lean back slightly, rotate DB side to side from the waist. Feet down to start.",
        video: "https://www.youtube.com/watch?v=BA-uP_-bVE8",
      },
    ],
    cooldown: [
      {
        name: "Band-assisted cross-body stretch (low anchor)",
        cue: "Hold handle, pull arm gently across body — 30 sec/side",
      },
      { name: "Cross-body shoulder stretch", cue: "30 sec/side" },
      {
        name: "Sleeper stretch",
        cue: "Gentle internal rotation — 30 sec/side",
      },
      {
        name: "Supine spinal twist",
        cue: "On back, knees to one side — 30 sec/side",
      },
      { name: "Child's pose + deep breathing", cue: "60 sec" },
    ],
  },
  {
    slug: "day4",
    number: 4,
    title: "Legs (+ Glutes & Calves)",
    subtitle:
      "Quads, hamstrings, glutes, calves — the biggest muscles, trained when you're fresh.",
    warmup: [
      {
        name: "Band good-morning / hip hinge (low anchor)",
        cue: "Stand on/face anchor, handles at hips, hinge back and stand — 12 reps",
      },
      { name: "Bodyweight squats", cue: "Slow + controlled — 10 reps" },
      { name: "Walking / reverse lunges", cue: "Open the hips — 5/side" },
      {
        name: "Leg swings (front-back + side)",
        cue: "Hold bench for balance — 10 each",
      },
      { name: "Glute bridges", cue: "Wake up the glutes — 12 reps" },
    ],
    main: [
      {
        key: "day4-goblet-squat",
        name: "Goblet Squat",
        equipment: "Dumbbell",
        prescription: "3 × 10",
        rest: "60–90 s",
        form:
          "Hold one DB at chest. Sit back, knees track over toes, chest tall, heels down. Go as low as comfortable.",
        video: "https://www.youtube.com/watch?v=gm4ln6PO4rc",
      },
      {
        key: "day4-db-rdl",
        name: "Dumbbell Romanian Deadlift",
        equipment: "Dumbbells",
        prescription: "3 × 10",
        rest: "60–90 s",
        form:
          "Soft knees, push hips back, DBs slide close to legs. Feel hamstring stretch; flat back throughout.",
        video: "https://www.youtube.com/watch?v=aa57T45iFSE",
      },
      {
        key: "day4-reverse-lunge",
        name: "Reverse Lunge",
        equipment: "Dumbbells",
        prescription: "3 × 8/leg",
        rest: "60 s",
        form:
          "Step back, drop rear knee toward floor, front knee over ankle. Drive through front heel to stand.",
        video: "https://www.youtube.com/watch?v=sjlsISvHyZs",
      },
      {
        key: "day4-step-up",
        name: "Dumbbell Step-Up",
        equipment: "Dumbbells, Bench",
        prescription: "3 × 8/leg",
        rest: "60 s",
        form:
          "Full foot on bench, drive through heel to stand tall. Control the way down. Bodyweight first.",
        video: "https://www.youtube.com/watch?v=9ZknEYboBOQ",
      },
      {
        key: "day4-hip-thrust",
        name: "Dumbbell Hip Thrust",
        equipment: "Dumbbell, Bench",
        prescription: "3 × 12",
        rest: "60 s",
        form:
          "Upper back on bench, DB across hips. Drive hips up, squeeze glutes at top, lower slow.",
        video: "https://www.youtube.com/watch?v=LM8XHLYJoYs",
      },
      {
        key: "day4-calf-raise",
        name: "Standing Calf Raise",
        equipment: "Dumbbells",
        prescription: "3 × 15",
        rest: "30 s",
        form:
          "Hold DBs, rise onto toes slowly, pause at top, lower under control. Hold bench for balance if needed.",
        video: "https://www.youtube.com/watch?v=wxwY7GXxL4k",
      },
    ],
    cooldown: [
      {
        name: "Band-assisted hamstring stretch (low anchor)",
        cue: "Loop band on foot, straighten leg — 30 sec/side",
      },
      {
        name: "Standing / lying quad stretch",
        cue: "Heel to glute — 30 sec/side",
      },
      {
        name: "Kneeling hip-flexor stretch",
        cue: "Tuck pelvis, lean forward — 30 sec/side",
      },
      {
        name: "Figure-4 / pigeon stretch",
        cue: "Open the glutes — 30 sec/side",
      },
      {
        name: "Downward-dog calf stretch",
        cue: "Pedal heels down — 45 sec",
      },
    ],
  },
];

export function getDayBySlug(slug: string): Day | undefined {
  return GYM_PLAN.find((d) => d.slug === slug);
}
