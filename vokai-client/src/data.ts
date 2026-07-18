export const LANGUAGES = ['JavaScript', 'Python', 'Java', 'C++', 'Rust', 'Kotlin', 'React Native', 'Other'] as const;
export type Language = (typeof LANGUAGES)[number];

export type LessonTask = {
  id: string;
  title: string;
  detail: string;
  duration: number;
  kind: 'learn' | 'build' | 'reflect';
};

export type LearningPace = 'beginner' | 'intermediate' | 'advanced';

const TOPICS: Record<Language, string[]> = {
  JavaScript: ['Variables & data types', 'Functions & scope', 'Arrays & objects', 'DOM basics', 'Async JavaScript', 'APIs & fetch'],
  Python: ['Variables & strings', 'Lists & dictionaries', 'Functions', 'Loops & conditions', 'Files & modules', 'Working with APIs'],
  Java: ['Syntax & variables', 'Methods', 'Classes & objects', 'Collections', 'Inheritance', 'Error handling'],
  'C++': ['Variables & types', 'Functions', 'Control flow', 'Pointers', 'Classes', 'STL containers'],
  Rust: ['Ownership & borrowing', 'Structs & enums', 'Pattern matching', 'Collections', 'Error handling', 'Traits'],
  Kotlin: ['Variables & types', 'Functions', 'Classes & data classes', 'Null safety', 'Collections', 'Coroutines'],
  'React Native': ['Core components', 'Props & state', 'Navigation', 'Lists & forms', 'Async storage', 'Native features'],
  Other: ['Foundations', 'Core syntax', 'Control flow', 'Functions', 'Data structures', 'Build a small project'],
};

export function tasksForDay(language: string, day: number, pace: LearningPace = 'beginner'): LessonTask[] {
  const topics = TOPICS[language as Language] ?? TOPICS.Other;
  const topic = topics[(Math.max(day, 1) - 1) % topics.length];
  const plan = pace === 'beginner'
    ? {
        learn: `Learn: ${topic}`,
        learnDetail: `Start from the very beginning with today's focused ${language} lesson.`,
        build: 'Try one tiny example',
        buildDetail: 'Follow a small example, then change one line and run it yourself.',
        reflect: 'Say what you learned',
        reflectDetail: 'Save your work and write one simple sentence about the new idea.',
        durations: [20, 20, 10],
      }
    : pace === 'intermediate'
      ? {
          learn: `Strengthen: ${topic}`,
          learnDetail: `Review the essentials, then connect ${topic} to a real ${language} use case.`,
          build: 'Build a useful variation',
          buildDetail: 'Solve a compact exercise without copying the answer, then improve it once.',
          reflect: 'Capture the pattern',
          reflectDetail: 'Commit your work and note when you would use this pattern again.',
          durations: [18, 27, 10],
        }
      : {
          learn: `Deep dive: ${topic}`,
          learnDetail: `Focus on the trade-offs, idioms, and edge cases behind ${topic} in ${language}.`,
          build: 'Ship a focused challenge',
          buildDetail: 'Implement a small production-style exercise with one deliberate design choice.',
          reflect: 'Review your trade-off',
          reflectDetail: 'Commit the result and write the decision, test, or improvement you would make next.',
          durations: [15, 30, 10],
        };
  return [
    { id: 'learn', kind: 'learn', title: plan.learn, detail: plan.learnDetail, duration: plan.durations[0] },
    { id: 'build', kind: 'build', title: plan.build, detail: plan.buildDetail, duration: plan.durations[1] },
    { id: 'reflect', kind: 'reflect', title: plan.reflect, detail: plan.reflectDetail, duration: plan.durations[2] },
  ];
}

export const MILESTONES = [
  { day: 1, icon: '🫖', title: 'Welcome pot', text: 'Your garden pot is ready from your first day.' },
  { day: 5, icon: '🦋', title: 'First visitors', text: 'Flowers and a friendly bee arrive.' },
  { day: 12, icon: '🍂', title: 'Changing leaves', text: 'A little autumn colour joins the garden.' },
  { day: 21, icon: '🌳', title: 'Strong roots', text: 'Your Clario garden tree takes root.' },
  { day: 45, icon: '🫐', title: 'Berry sprigs', text: 'Your steady practice grows fruit.' },
  { day: 60, icon: '🐝', title: 'Garden hum', text: 'More bees join your learning garden.' },
  { day: 90, icon: '🐸', title: 'Full bloom', text: 'Your 90-day coding garden is complete.' },
] as const;
