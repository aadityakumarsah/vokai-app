import { BusyBlock, ExperienceLevel, LearnerProfile } from './storage';
import type { LessonTask } from './data';
import type { SupabaseAuthConfig } from './supabase';

type ApiEnvelope<T> = { success: boolean; data?: T };
export type RemoteCheckIn = {
  check_date: string;
  journey_day: number;
  learn: boolean;
  build: boolean;
  reflect: boolean;
  day_complete: boolean;
  completed_at: string | null;
  current_streak?: number;
  completed_days?: number;
};
export type RemoteProfile = {
  email: string;
  name: string;
  language: string;
  custom_language: string | null;
  experience_level: ExperienceLevel;
  free_time: string;
  daily_minutes: number;
  reminders: boolean;
  started_at: string;
  busy_schedule: BusyBlock[];
  routine_note: string;
};
export type SyllabusTopic = {
  id: string;
  day: number;
  title: string;
  kind: 'topic' | 'practice';
  completed: boolean;
};
export type Syllabus = {
  language: string;
  experience_level: ExperienceLevel;
  generated_at: string;
  topics: SyllabusTopic[];
};
export type JourneySnapshot = {
  profile: RemoteProfile | null;
  journey_day: number;
  today: RemoteCheckIn;
  week: RemoteCheckIn[];
  garden: { journey_day: number; unlocked: Array<{ day: number; key: string; title: string }>; next_unlock: { day: number; key: string; title: string } | null };
};
export type FocusCoachMessage = {
  role: 'user' | 'assistant';
  text: string;
};
export type FocusCoachReply = { reply: string };

const configuredBaseUrl = (process.env.EXPO_PUBLIC_VOKAI_API_URL ?? '').replace(/\/$/, '');
// Expo Go can run either on a physical Android device or an Android Studio
// emulator. Each reaches the Mac host through a different address, so retain
// both safe local fallbacks instead of making sign-in depend on one URL.
const localFallbackUrls = ['http://192.168.100.2:8000', 'http://10.0.2.2:8000'];
let resolvedBaseUrl = configuredBaseUrl;

function apiBaseUrls() {
  return Array.from(new Set([resolvedBaseUrl, configuredBaseUrl, ...localFallbackUrls].filter(Boolean)));
}

export const localCheckDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export async function fetchSupabaseAuthConfig(): Promise<SupabaseAuthConfig | null> {
  const checks = await Promise.all(apiBaseUrls().map(async (baseUrl) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(`${baseUrl}/vokai/auth/config`, { signal: controller.signal });
      if (!response.ok) return null;
      const envelope = await response.json() as ApiEnvelope<SupabaseAuthConfig>;
      return envelope.success && envelope.data ? { baseUrl, config: envelope.data } : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }));
  const available = checks.find((check) => check !== null);
  if (!available) return null;
  resolvedBaseUrl = available.baseUrl;
  return available.config;
}

async function request<T>(path: string, accessToken: string, init?: RequestInit): Promise<T | null> {
  for (const baseUrl of apiBaseUrls()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(init?.headers ?? {}),
        },
      });
      if (!response.ok) continue;
      const envelope = await response.json() as ApiEnvelope<T>;
      if (envelope.success) {
        resolvedBaseUrl = baseUrl;
        return envelope.data ?? null;
      }
    } catch {
      // Try the matching emulator or physical-device address next.
    }
  }
  return null;
}

export function syncVokaiProfile(accessToken: string, profile: LearnerProfile, startedAt: string) {
  return request<JourneySnapshot>('/vokai/profile', accessToken, {
    method: 'PUT',
    body: JSON.stringify({
      name: profile.name,
      language: profile.language,
      custom_language: profile.customLanguage?.trim() || null,
      experience_level: profile.experienceLevel,
      free_time: profile.freeTime,
      daily_minutes: profile.dailyMinutes,
      reminders: profile.reminders,
      busy_schedule: profile.busySchedule,
      routine_note: profile.routineNote,
      started_at: startedAt,
    }),
  });
}

export function fetchVokaiSyllabus(accessToken: string) {
  return request<Syllabus>('/vokai/syllabus', accessToken);
}

export function generateVokaiSyllabus(accessToken: string) {
  return request<Syllabus>('/vokai/syllabus/generate', accessToken, { method: 'POST' });
}

export function syncVokaiSyllabusTopic(accessToken: string, topicId: string, completed: boolean) {
  return request<Syllabus>('/vokai/syllabus/topics', accessToken, {
    method: 'PUT',
    body: JSON.stringify({ topic_id: topicId, completed }),
  });
}

export function syncVokaiCheckIn(
  accessToken: string,
  task: 'learn' | 'build' | 'reflect',
  completed: boolean,
) {
  return request<JourneySnapshot>('/vokai/check-ins', accessToken, {
    method: 'PUT',
    body: JSON.stringify({ check_date: localCheckDate(), task, completed }),
  });
}

export function fetchVokaiJourney(accessToken: string) {
  return request<JourneySnapshot>(`/vokai/bootstrap?check_date=${localCheckDate()}`, accessToken);
}

export function resetVokaiJourney(accessToken: string) {
  return request<null>('/vokai/journey', accessToken, { method: 'DELETE' });
}

export function askFocusCoach(
  accessToken: string,
  messages: FocusCoachMessage[],
  activeTask: LessonTask,
) {
  return request<FocusCoachReply>('/vokai/focus/coach', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      messages,
      active_task_title: activeTask.title,
      active_task_detail: activeTask.detail,
      active_task_minutes: activeTask.duration,
    }),
  });
}
