import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language } from './data';

const PROFILE_KEY = 'vokai-profile-v1';
const PROGRESS_KEY = 'vokai-progress-v1';

export type LearnerProfile = {
  name: string;
  language: Language;
  customLanguage?: string;
  experienceLevel: ExperienceLevel;
  freeTime: string;
  dailyMinutes: number;
  reminders: boolean;
  busySchedule: BusyBlock[];
  routineNote: string;
};

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type BusyBlock = {
  id: string;
  title: string;
  start: string;
  end: string;
};

export type Progress = {
  startedAt: string;
  completedDays: number[];
  tasksByDay: Record<number, string[]>;
};

export const defaultProgress = (): Progress => ({
  startedAt: new Date().toISOString(),
  completedDays: [],
  tasksByDay: {},
});

function keyForUser(key: string, userId: string) {
  return `${key}:${userId}`;
}

export async function loadAppData(userId: string): Promise<{ profile: LearnerProfile | null; progress: Progress }> {
  try {
    const [profileRaw, progressRaw] = await Promise.all([
      AsyncStorage.getItem(keyForUser(PROFILE_KEY, userId)),
      AsyncStorage.getItem(keyForUser(PROGRESS_KEY, userId)),
    ]);
    const savedProfile = profileRaw ? JSON.parse(profileRaw) as LearnerProfile : null;
    return {
      profile: savedProfile ? { ...savedProfile, experienceLevel: savedProfile.experienceLevel ?? 'beginner', busySchedule: savedProfile.busySchedule ?? [], routineNote: savedProfile.routineNote ?? '' } : null,
      progress: progressRaw ? { ...defaultProgress(), ...JSON.parse(progressRaw) } : defaultProgress(),
    };
  } catch {
    return { profile: null, progress: defaultProgress() };
  }
}

export function saveProfile(userId: string, profile: LearnerProfile) {
  return AsyncStorage.setItem(keyForUser(PROFILE_KEY, userId), JSON.stringify(profile));
}

export function saveProgress(userId: string, progress: Progress) {
  return AsyncStorage.setItem(keyForUser(PROGRESS_KEY, userId), JSON.stringify(progress));
}

export async function resetAppData(userId: string) {
  await AsyncStorage.multiRemove([keyForUser(PROFILE_KEY, userId), keyForUser(PROGRESS_KEY, userId)]);
}
