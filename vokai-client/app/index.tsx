import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { GardenScene } from '../src/components/GardenScene';
import { LeaderboardCity, type LeaderboardEntry } from '../src/components/LeaderboardCity';
import { speechRecognitionModule } from '../src/speechRecognition';
import { LANGUAGES, Language, LessonTask, MILESTONES, tasksForDay } from '../src/data';
import { setDailyReminder } from '../src/notifications';
import { BusyBlock, defaultProgress, ExperienceLevel, LearnerProfile, loadAppData, Progress, resetAppData, saveProfile, saveProgress } from '../src/storage';
import { colors, fonts, gradients, shadow } from '../src/theme';
import {
  fetchSupabaseAuthConfig,
  fetchVokaiSyllabus,
  fetchVokaiJourney,
  fetchVokaiFriends,
  fetchVokaiFriendProfile,
  askFocusCoach,
  generateVokaiSyllabus,
  removeVokaiFriend,
  resetVokaiJourney,
  respondToVokaiFriendRequest,
  sendVokaiFriendRequest,
  syncVokaiCheckIn,
  syncVokaiProfile,
  syncVokaiSyllabusTopic,
  type Syllabus,
  type FocusCoachMessage,
  type JourneySnapshot,
  type RemoteCheckIn,
  type Friend,
  type FriendRequest,
  type FriendProfile,
  type FriendsSnapshot,
  uploadVokaiProfilePhoto,
} from '../src/vokaiApi';
import { createVokaiSupabase, signInWithGoogle } from '../src/supabase';

type Screen = 'home' | 'garden' | 'syllabus' | 'focus' | 'friends' | 'leaderboard' | 'profile' | 'friendProfile' | 'settings' | 'schedule';
type OnboardingDraft = LearnerProfile;

type IconProps = { size?: number; color?: string; fill?: string; strokeWidth?: number };
function glyph(symbol: string) {
  return function Glyph({ size = 16, color = colors.ink }: IconProps) {
    return <Text style={{ color, fontSize: size, lineHeight: size + 2, fontWeight: '800', textAlign: 'center' }}>{symbol}</Text>;
  };
}
const ArrowLeft = glyph('←');
const BookOpen = glyph('▤');
const Check = glyph('✓');
const ChevronRight = glyph('›');
const Clock3 = glyph('◷');
const Code2 = glyph('</>');
const Flame = glyph('♨');
const Home = glyph('⌂');
const Leaf = glyph('⌁');
const Play = glyph('▶');
const RotateCcw = glyph('↺');
const Settings = glyph('⚙');
const Sparkles = glyph('✦');
const Sprout = glyph('♧');
const TimerReset = glyph('↺');

type CoachMessage = FocusCoachMessage & { id: string };
type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const SYLLABUS_PHASES: Array<{ id: string; title: string; days: string; start: number; end: number; icon: MaterialIconName }> = [
  { id: 'start', title: 'Start strong', days: 'Days 1–15', start: 1, end: 15, icon: 'rocket-launch-outline' },
  { id: 'foundation', title: 'Build foundations', days: 'Days 16–35', start: 16, end: 35, icon: 'book-open-variant' },
  { id: 'practice', title: 'Learn by doing', days: 'Days 36–55', start: 36, end: 55, icon: 'code-braces' },
  { id: 'deepen', title: 'Go deeper', days: 'Days 56–75', start: 56, end: 75, icon: 'flask-outline' },
  { id: 'finish', title: 'Finish with confidence', days: 'Days 76–90', start: 76, end: 90, icon: 'trophy-outline' },
];

const starterProfile: OnboardingDraft = {
  name: '',
  language: 'JavaScript',
  experienceLevel: 'beginner',
  freeTime: '19:00',
  dailyMinutes: 45,
  reminders: true,
  busySchedule: [],
  routineNote: '',
};

function courseDay(startedAt: string) {
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 86_400_000);
  return Math.min(90, Math.max(1, elapsed + 1));
}

function localWeek(day: number, progress: Progress): RemoteCheckIn[] {
  const firstDay = Math.max(1, day - 6);
  return Array.from({ length: day - firstDay + 1 }, (_, index) => {
    const journeyDay = firstDay + index;
    const taskIds = new Set(progress.tasksByDay[journeyDay] ?? []);
    return {
      check_date: `local-${journeyDay}`,
      journey_day: journeyDay,
      learn: taskIds.has('learn'),
      build: taskIds.has('build'),
      reflect: taskIds.has('reflect'),
      day_complete: progress.completedDays.includes(journeyDay),
      completed_at: null,
    };
  });
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function calendarWeekTracker(history: Array<{ check_date: string; day_complete: boolean }>) {
  const today = new Date();
  const firstDay = new Date(today);
  firstDay.setDate(today.getDate() - today.getDay());
  const byDate = new Map(history.map((checkIn) => [checkIn.check_date, checkIn]));
  return WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    const key = localDateKey(date);
    return { key, label, isToday: key === localDateKey(today), checkIn: byDate.get(key) };
  });
}

function taskIdsFromCheckIn(checkIn: RemoteCheckIn): string[] {
  return (['learn', 'build', 'reflect'] as const).filter((task) => checkIn[task]);
}

function mergeProgressWithSnapshot(previous: Progress, snapshot: JourneySnapshot): Progress {
  const serverDays = new Set(snapshot.week.map((checkIn) => checkIn.journey_day));
  const tasksByDay = { ...previous.tasksByDay };
  for (const checkIn of snapshot.week) tasksByDay[checkIn.journey_day] = taskIdsFromCheckIn(checkIn);
  const completedDays = [
    ...previous.completedDays.filter((completedDay) => !serverDays.has(completedDay)),
    ...snapshot.week.filter((checkIn) => checkIn.day_complete).map((checkIn) => checkIn.journey_day),
  ];
  return { ...previous, tasksByDay, completedDays: Array.from(new Set(completedDays)) };
}

function profileFromSnapshot(snapshot: JourneySnapshot): LearnerProfile | null {
  if (!snapshot.profile) return null;
  return {
    name: snapshot.profile.name,
    profileImageUrl: snapshot.profile.profile_image_url ?? undefined,
    language: snapshot.profile.language as Language,
    customLanguage: snapshot.profile.custom_language ?? undefined,
    experienceLevel: snapshot.profile.experience_level ?? 'beginner',
    freeTime: snapshot.profile.free_time,
    dailyMinutes: snapshot.profile.daily_minutes,
    reminders: snapshot.profile.reminders,
    busySchedule: snapshot.profile.busy_schedule ?? [],
    routineNote: snapshot.profile.routine_note ?? '',
  };
}

function authFirstName(user: User | null) {
  const metadata = user?.user_metadata ?? {};
  const candidate = metadata.full_name ?? metadata.name ?? metadata.preferred_username ?? user?.email?.split('@')[0] ?? '';
  return String(candidate).trim().split(' ')[0];
}

function learningLanguage(profile: LearnerProfile) {
  return profile.language === 'Other' ? profile.customLanguage?.trim() || 'your language' : profile.language;
}

function hasOneTopicPerDay(syllabus: Syllabus) {
  return syllabus.topics.length === 90 && new Set(syllabus.topics.map((topic) => topic.day)).size === 90 && syllabus.topics.every((topic) => topic.day >= 1 && topic.day <= 90);
}

function minutesFromTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0;
}

function timeFromMinutes(totalMinutes: number) {
  const minutes = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

type Meridiem = 'AM' | 'PM';

function timeParts12(time: string): { clock: string; meridiem: Meridiem } {
  const [rawHour, rawMinute] = time.split(':').map(Number);
  const hour = Number.isFinite(rawHour) && rawHour >= 0 && rawHour <= 23 ? rawHour : 19;
  const minute = Number.isFinite(rawMinute) && rawMinute >= 0 && rawMinute <= 59 ? rawMinute : 0;
  return {
    clock: `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    meridiem: hour >= 12 ? 'PM' : 'AM',
  };
}

function timeFrom12(clock: string, meridiem: Meridiem, fallback: string) {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(clock.trim());
  if (!match) return fallback;
  const rawHour = Number(match[1]);
  const minute = Number(match[2]);
  if (rawHour < 1 || rawHour > 12) return fallback;
  const hour = meridiem === 'AM'
    ? (rawHour === 12 ? 0 : rawHour)
    : (rawHour === 12 ? 12 : rawHour + 12);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatTime12(time: string) {
  const { clock, meridiem } = timeParts12(time);
  return `${clock} ${meridiem}`;
}

function suggestedLearningWindow(busySchedule: BusyBlock[], dailyMinutes: number) {
  const validBlocks = busySchedule
    .filter((block) => /^([01]\d|2[0-3]):[0-5]\d$/.test(block.start) && /^([01]\d|2[0-3]):[0-5]\d$/.test(block.end))
    .map((block) => ({ start: minutesFromTime(block.start), end: minutesFromTime(block.end) }))
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start);
  const dayStart = 6 * 60;
  const dayEnd = 22 * 60;
  const freeWindows: Array<{ start: number; end: number }> = [];
  let cursor = dayStart;
  for (const block of validBlocks) {
    if (block.start > cursor) freeWindows.push({ start: cursor, end: Math.min(block.start, dayEnd) });
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < dayEnd) freeWindows.push({ start: cursor, end: dayEnd });
  const eligible = freeWindows.filter((window) => window.end - window.start >= dailyMinutes);
  const chosen = eligible.sort((a, b) => (b.end - b.start) - (a.end - a.start)).at(0);
  const start = chosen?.start ?? 19 * 60;
  return { start: timeFromMinutes(start), end: timeFromMinutes(start + dailyMinutes) };
}

type SchedulePlanItem = { time: string; title: string; detail: string; icon: MaterialIconName };

function dailySchedulePlan(profile: LearnerProfile): SchedulePlanItem[] {
  const language = learningLanguage(profile);
  const window = suggestedLearningWindow(profile.busySchedule, profile.dailyMinutes);
  const start = minutesFromTime(window.start);
  const ratios = profile.experienceLevel === 'beginner' ? [0.45, 0.35] : profile.experienceLevel === 'intermediate' ? [0.3, 0.5] : [0.25, 0.6];
  const reflectMinutes = Math.max(5, Math.round(profile.dailyMinutes * 0.15));
  const workMinutes = profile.dailyMinutes - reflectMinutes;
  const learnMinutes = Math.max(10, Math.round(workMinutes * (ratios[0] / (ratios[0] + ratios[1]))));
  const buildMinutes = Math.max(5, profile.dailyMinutes - reflectMinutes - learnMinutes);
  const buildStart = start + learnMinutes;
  const reflectStart = buildStart + buildMinutes;
  const levelPlan = profile.experienceLevel === 'beginner'
    ? { learn: `Learn one small ${language} idea`, build: 'Try it with a tiny example', reflect: 'Explain what clicked' }
    : profile.experienceLevel === 'intermediate'
      ? { learn: `Review and connect ${language}`, build: 'Apply it in a short challenge', reflect: 'Capture the useful pattern' }
      : { learn: `Study the ${language} trade-off`, build: 'Ship a focused implementation', reflect: 'Review the design decision' };
  return [
    { time: formatTime12(timeFromMinutes(start)), title: levelPlan.learn, detail: `${learnMinutes} min · your ${profile.experienceLevel} learning block`, icon: 'book-open-page-variant-outline' },
    { time: formatTime12(timeFromMinutes(buildStart)), title: levelPlan.build, detail: `${buildMinutes} min · write and run code yourself`, icon: 'code-braces' },
    { time: formatTime12(timeFromMinutes(reflectStart)), title: levelPlan.reflect, detail: `${reflectMinutes} min · save one note or commit`, icon: 'check-circle-outline' },
  ];
}

function Heading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.headingTitle}>{title}</Text>
      {!!sub && <Text style={styles.headingSub}>{sub}</Text>}
    </View>
  );
}

function ProgressBar({ value, color = colors.forest }: { value: number; color?: string }) {
  return <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} /></View>;
}

function IconButton({ onPress, children, label }: { onPress: () => void; children: React.ReactNode; label: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>{children}</Pressable>;
}

function GardenPage({ profile, progress, day, week, onBack }: { profile: LearnerProfile; progress: Progress; day: number; week: RemoteCheckIn[]; onBack: () => void }) {
  const completed = progress.tasksByDay[day]?.length ?? 0;
  const history = week.length ? week : localWeek(day, progress);
  const streak = useMemo(() => {
    let result = 0;
    for (let d = day; d >= 1 && progress.completedDays.includes(d); d -= 1) result += 1;
    return result;
  }, [day, progress.completedDays]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}>
        <IconButton label="Back to dashboard" onPress={onBack}><ArrowLeft color={colors.ink} size={21} /></IconButton>
        <View style={styles.streakPill}><Flame size={15} color="#B66D22" fill="#FFC761" /><Text style={styles.streakText}>{streak} day streak</Text></View>
      </View>
      <Heading eyebrow="YOUR LEARNING SPACE" title="coding garden" sub="Every finished day turns effort into something you can see." />
      <View style={styles.gardenFrame}>
        <GardenScene dayCount={day} completedCount={completed} />
        <View style={styles.gardenCaption}><Leaf size={16} color={colors.forest} /><Text style={styles.gardenCaptionText}>{completed === 3 ? 'Today is in full bloom. Lovely work.' : `${3 - completed} small ${3 - completed === 1 ? 'step' : 'steps'} left to bloom today.`}</Text></View>
      </View>

      <Text style={styles.sectionTitle}>this week</Text>
      <View style={styles.weekCard}>
        {history.map((checkIn) => {
          const done = checkIn.day_complete;
          const isToday = checkIn.journey_day === day;
          return <View style={styles.dayColumn} key={checkIn.check_date}>
            <View style={[styles.dayDot, done && styles.dayDotDone, isToday && styles.dayDotToday]}>{done ? <Check size={14} color="#fff" strokeWidth={3} /> : <Text style={styles.dayDotText}>{checkIn.journey_day}</Text>}</View>
            <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{isToday ? 'Today' : `D${checkIn.journey_day}`}</Text>
          </View>;
        })}
      </View>

      <View style={styles.statGrid}>
        <Stat number={day} label="journey day" />
        <Stat number={streak} label="current streak" />
        <Stat number={`${Math.round((day / 90) * 100)}%`} label="journey done" />
      </View>

      <Text style={styles.sectionTitle}>garden milestones</Text>
      <View style={styles.milestoneCard}>
        {MILESTONES.map((milestone, index) => {
          const unlocked = day >= milestone.day;
          return <View key={milestone.day} style={[styles.milestoneRow, index !== MILESTONES.length - 1 && styles.milestoneBorder]}>
            <View style={[styles.milestoneIcon, unlocked && styles.milestoneIconUnlocked]}><Text>{unlocked ? '✓' : milestone.icon}</Text></View>
            <View style={styles.milestoneText}><Text style={[styles.milestoneTitle, !unlocked && styles.lockedText]}>{milestone.title}</Text><Text style={styles.milestoneSub}>{unlocked ? milestone.text : `Unlock on day ${milestone.day}`}</Text></View>
            <Text style={[styles.milestoneDay, unlocked && styles.milestoneDayUnlocked]}>D{milestone.day}</Text>
          </View>;
        })}
      </View>
    </ScrollView>
  );
}

function tutorPrompt(profile: LearnerProfile, topicTitle: string, kind: 'topic' | 'practice') {
  const language = learningLanguage(profile);
  const experience = profile.experienceLevel;
  const practiceLine = kind === 'practice'
    ? 'Give me one tiny practice challenge first. Do not show the answer until I try.'
    : 'End with one tiny practice challenge and a hint.';
  return `Teach me “${topicTitle}” in ${language} like I am 5 years old. I am a ${experience} learner. Use very simple words, but keep the coding correct. Explain: 1) what it means, 2) a real-life example, 3) why programmers use it, 4) the workflow in small steps, 5) one tiny ${language} code example with a line-by-line explanation. ${practiceLine} Keep the answer short, kind, and easy to understand.`;
}

function topicCompletionSteps(profile: LearnerProfile, topicTitle: string, kind: 'topic' | 'practice') {
  const language = learningLanguage(profile);
  if (kind === 'practice') return [
    { title: 'Read the challenge', text: `Understand what the ${topicTitle} task asks you to make.` },
    { title: 'Build it yourself', text: `Write the ${language} solution without copying an answer.` },
    { title: 'Run and improve', text: 'Test it, fix one mistake if needed, then save your work.' },
  ];
  return [
    { title: 'Learn the idea', text: `Spend 10–15 minutes on “${topicTitle}” from a trusted ${language} resource.` },
    { title: 'Make a tiny example', text: `Create one small ${language} file that uses this topic.` },
    { title: 'Check your understanding', text: 'Explain it in one simple sentence, run the code, and save it.' },
  ];
}

function SyllabusPage({ profile, day, syllabus, loading, onBack, onToggle }: {
  profile: LearnerProfile;
  day: number;
  syllabus: Syllabus | null;
  loading: boolean;
  onBack: () => void;
  onToggle: (topicId: string, completed: boolean) => void;
}) {
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [todayPlanExpanded, setTodayPlanExpanded] = useState(false);
  const [backlogExpanded, setBacklogExpanded] = useState(false);
  const [visibleTopicCount, setVisibleTopicCount] = useState(12);
  const completed = syllabus?.topics.filter((topic) => topic.completed).length ?? 0;
  const orderedTopics = syllabus ? [...syllabus.topics].sort((left, right) => left.day - right.day || left.title.localeCompare(right.title)) : [];
  const visibleTopics = orderedTopics.slice(0, visibleTopicCount);
  const visiblePhases = SYLLABUS_PHASES.filter((phase) => visibleTopics.some((topic) => topic.day >= phase.start && topic.day <= phase.end));
  const scheduledToday = syllabus?.topics.filter((topic) => topic.day === day) ?? [];
  const backlogTopics = orderedTopics.filter((topic) => topic.day < day && !topic.completed);
  const backlogDayCount = new Set(backlogTopics.map((topic) => topic.day)).size;
  const visibleBacklogTopics = backlogExpanded ? backlogTopics : backlogTopics.slice(0, 3);
  const nextScheduledDay = syllabus?.topics.find((topic) => topic.day > day)?.day;
  const todayTopics = scheduledToday.length ? scheduledToday : (syllabus?.topics.filter((topic) => topic.day === nextScheduledDay) ?? []);
  const planDay = scheduledToday.length ? day : nextScheduledDay;
  const experienceLabel = profile.experienceLevel.charAt(0).toUpperCase() + profile.experienceLevel.slice(1);
  const hasMoreTopics = visibleTopicCount < orderedTopics.length;
  useEffect(() => { setVisibleTopicCount(12); setExpandedTopicId(null); setBacklogExpanded(false); }, [syllabus?.generated_at]);
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.topRow}><IconButton label="Back to dashboard" onPress={onBack}><ArrowLeft color={colors.ink} size={21} /></IconButton><Text style={styles.settingsTopLabel}>SYLLABUS</Text><View style={{ width: 42 }} /></View>
      <View style={styles.syllabusHeading}><View style={styles.syllabusHeadingIcon}><MaterialCommunityIcons name="book-open-page-variant-outline" size={22} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.eyebrow}>YOUR LEARNING PATH</Text><Text style={styles.syllabusTitle}>{learningLanguage(profile)} syllabus</Text><Text style={styles.syllabusSub}>{experienceLabel} · topic-by-topic for 90 days</Text></View></View>
      {loading ? <View style={styles.syllabusLoading}><MaterialCommunityIcons name="loading" size={25} color={colors.forest} /><Text style={styles.syllabusLoadingTitle}>Building your path…</Text><Text style={styles.syllabusLoadingSub}>Checking current documentation and arranging topics.</Text></View> : !syllabus ? <View style={styles.syllabusEmpty}><MaterialCommunityIcons name="book-clock-outline" size={28} color={colors.forest} /><Text style={styles.syllabusEmptyTitle}>Preparing your syllabus</Text><Text style={styles.syllabusEmptySub}>It will appear automatically while you use VOKAI.</Text></View> : <>
        <View style={styles.syllabusProgressCard}><View><Text style={styles.syllabusProgressLabel}>PROGRESS</Text><Text style={styles.syllabusProgressNumber}>{completed} <Text style={styles.syllabusProgressTotal}>/ {syllabus.topics.length} topics</Text></Text></View><View style={styles.syllabusProgressCircle}><Text style={styles.syllabusProgressPercent}>{syllabus.topics.length ? Math.round((completed / syllabus.topics.length) * 100) : 0}%</Text></View></View>
        {backlogTopics.length > 0 && <View style={styles.backlogCard}>
          <Pressable accessibilityRole="button" accessibilityLabel={backlogExpanded ? 'Hide catch-up queue' : 'Show catch-up queue'} onPress={() => setBacklogExpanded((expanded) => !expanded)} style={styles.backlogHeader}>
            <View style={styles.backlogIcon}><MaterialCommunityIcons name="clock-alert-outline" size={19} color="#9A5D1C" /></View>
            <View style={{ flex: 1 }}><Text style={styles.backlogEyebrow}>CATCH-UP QUEUE</Text><Text style={styles.backlogTitle}>{backlogDayCount} {backlogDayCount === 1 ? 'study day' : 'study days'} behind</Text><Text style={styles.backlogSub}>{backlogTopics.length} unfinished {backlogTopics.length === 1 ? 'topic' : 'topics'} from earlier days</Text></View>
            <MaterialCommunityIcons name={backlogExpanded ? 'chevron-up' : 'chevron-down'} size={21} color="#9A5D1C" />
          </Pressable>
          {backlogExpanded && <View style={styles.backlogBody}>
            <Text style={styles.backlogHint}>Start with the oldest item. Each checkmark is saved to your account.</Text>
            {visibleBacklogTopics.map((topic) => <View key={`backlog-${topic.id}`} style={styles.backlogTopicRow}>
              <View style={styles.backlogDayPill}><Text style={styles.backlogDayText}>DAY {topic.day}</Text></View>
              <Text style={styles.backlogTopicTitle}>{topic.title}</Text>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: topic.completed }} accessibilityLabel={`Mark backlog topic ${topic.title} complete`} onPress={() => onToggle(topic.id, true)} style={styles.backlogCheck}><MaterialCommunityIcons name="check" size={14} color="#fff" /></Pressable>
            </View>)}
          </View>}
        </View>}
        <View style={styles.todayPlanCard}>
          <Pressable accessibilityRole="button" accessibilityLabel={todayPlanExpanded ? 'Hide today completion plan' : 'Show today completion plan'} onPress={() => setTodayPlanExpanded((expanded) => !expanded)} style={styles.todayPlanHeader}>
            <View style={styles.todayPlanIcon}><MaterialCommunityIcons name="calendar-check-outline" size={19} color={colors.forest} /></View>
            <View style={{ flex: 1 }}><Text style={styles.todayPlanEyebrow}>WHAT TO COMPLETE TODAY</Text><Text style={styles.todayPlanTitle}>{scheduledToday.length ? `Day ${day} learning plan` : planDay ? `Next plan: Day ${planDay}` : 'Your next learning step'}</Text></View>
            <MaterialCommunityIcons name={todayPlanExpanded ? 'chevron-up' : 'chevron-down'} size={21} color={colors.forest} />
          </Pressable>
          {todayPlanExpanded && <View style={styles.todayPlanBody}>{todayTopics.length ? todayTopics.map((topic) => <View key={`today-${topic.id}`} style={styles.todayTopicCard}><View style={styles.todayTopicHeader}><View style={styles.todayTopicKind}><MaterialCommunityIcons name={topic.kind === 'practice' ? 'pencil-outline' : 'book-open-page-variant-outline'} size={14} color={colors.forest} /><Text style={styles.todayTopicKindText}>{topic.kind === 'practice' ? 'PRACTICE' : 'LEARN'}</Text></View>{topic.completed && <View style={styles.todayCompletePill}><MaterialCommunityIcons name="check" size={12} color={colors.forest} /><Text style={styles.todayCompleteText}>DONE</Text></View>}</View><Text style={styles.todayTopicTitle}>{topic.title}</Text>{topicCompletionSteps(profile, topic.title, topic.kind).map((step, index) => <View key={step.title} style={styles.todayStepRow}><View style={styles.todayStepNumber}><Text style={styles.todayStepNumberText}>{index + 1}</Text></View><View style={{ flex: 1 }}><Text style={styles.todayStepTitle}>{step.title}</Text><Text style={styles.todayStepText}>{step.text}</Text></View></View>)}<Text style={styles.todaySuccessText}>Complete when: the code is saved and you can explain the idea in your own words.</Text></View>) : <Text style={styles.todayNoPlanText}>Your next topic will appear here as your syllabus is completed.</Text>}</View>}
        </View>
        <View style={styles.syllabusAiHint}><MaterialCommunityIcons name="robot-outline" size={16} color={colors.forest} /><Text style={styles.syllabusAiHintText}>Tap a topic to open a ready-to-use ChatGPT or Claude learning prompt.</Text></View>
        <View style={styles.syllabusRoadmap}>{visiblePhases.map((phase) => {
          const phaseTopics = visibleTopics.filter((topic) => topic.day >= phase.start && topic.day <= phase.end);
          return <View key={phase.id} style={styles.roadmapPhase}>
            <View style={styles.roadmapPhaseHeader}><View style={styles.roadmapPhaseIcon}><MaterialCommunityIcons name={phase.icon} size={18} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.roadmapPhaseTitle}>{phase.title}</Text><Text style={styles.roadmapPhaseDays}>{phase.days}</Text></View><Text style={styles.roadmapPhaseCount}>{phaseTopics.length} TOPICS</Text></View>
            {phaseTopics.map((topic, index) => {
              const expanded = expandedTopicId === topic.id;
              const prompt = tutorPrompt(profile, topic.title, topic.kind);
              return <View key={topic.id} style={[styles.roadmapTopic, topic.completed && styles.syllabusTopicRowDone]}>
                <View style={styles.roadmapTimeline}><View style={[styles.roadmapDayDot, topic.day === day && styles.roadmapDayDotToday]}><Text style={[styles.roadmapDayDotText, topic.day === day && styles.roadmapDayDotTextToday]}>D{topic.day}</Text></View>{index < phaseTopics.length - 1 && <View style={styles.roadmapLine} />}</View>
                <View style={styles.roadmapTopicContent}>
                  <View style={styles.roadmapTopicRow}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: topic.completed }} accessibilityLabel={`Mark ${topic.title} ${topic.completed ? 'incomplete' : 'complete'}`} onPress={() => onToggle(topic.id, !topic.completed)} style={[styles.syllabusCheck, topic.completed && styles.syllabusCheckDone]}>{topic.completed && <MaterialCommunityIcons name="check" size={14} color="#fff" />}</Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Show AI learning prompt for ${topic.title}`} onPress={() => setExpandedTopicId((current) => current === topic.id ? null : topic.id)} style={styles.roadmapTopicOpen}><Text style={[styles.syllabusTopicTitle, topic.completed && styles.syllabusTopicTitleDone]}>{topic.title}</Text></Pressable>{topic.kind === 'practice' && <View style={styles.practiceTag}><Text style={styles.practiceTagText}>PRACTICE</Text></View>}<Pressable accessibilityLabel={expanded ? 'Hide AI learning prompt' : 'Show AI learning prompt'} onPress={() => setExpandedTopicId((current) => current === topic.id ? null : topic.id)} style={styles.syllabusTopicChevron}><MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={19} color={colors.forest} /></Pressable></View>
                  {topic.day === day && <Text style={styles.roadmapTodayText}>TODAY’S TOPIC</Text>}
                  {expanded && <View style={styles.syllabusPromptCard}><View style={styles.syllabusPromptHeader}><View style={styles.syllabusPromptIcon}><MaterialCommunityIcons name="message-text-outline" size={16} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.syllabusPromptTitle}>Ask ChatGPT or Claude</Text><Text style={styles.syllabusPromptSub}>A kid-friendly prompt for this topic</Text></View></View><Text selectable style={styles.syllabusPromptText}>{prompt}</Text><Pressable onPress={() => void Share.share({ message: prompt, title: `${topic.title} learning prompt` })} style={styles.syllabusPromptShare}><MaterialCommunityIcons name="content-copy" size={15} color={colors.forest} /><Text style={styles.syllabusPromptShareText}>Copy or share prompt</Text></Pressable></View>}
                </View>
              </View>;
            })}
          </View>;
        })}</View>
        {hasMoreTopics && <Pressable accessibilityRole="button" onPress={() => setVisibleTopicCount((count) => Math.min(orderedTopics.length, count + 12))} style={styles.syllabusLoadMore}><MaterialCommunityIcons name="chevron-down" size={18} color={colors.forest} /><Text style={styles.syllabusLoadMoreText}>Load 12 more topics</Text><Text style={styles.syllabusLoadMoreCount}>{visibleTopics.length} of {orderedTopics.length}</Text></Pressable>}
      </>}
    </ScrollView>
  );
}

function Stat({ number, label }: { number: number | string; label: string }) {
  return <View style={styles.statCard}><Text style={styles.statNumber}>{number}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function TaskCard({ task, index, checked, onCheck, onFocus }: { task: LessonTask; index: number; checked: boolean; onCheck: () => void; onFocus: () => void }) {
  const Icon = task.kind === 'learn' ? BookOpen : task.kind === 'build' ? Code2 : Sparkles;
  const accent = task.kind === 'learn' ? colors.amberRich : task.kind === 'build' ? colors.forest : colors.lavenderDeep;
  const gradient = task.kind === 'learn' ? gradients.learn : task.kind === 'build' ? gradients.build : gradients.reflect;
  const subtitle = task.kind === 'learn' ? 'LEARN THE CONCEPT' : task.kind === 'build' ? 'PRACTISE BY BUILDING' : 'REFLECT AND COMMIT';
  return (
    <Pressable onPress={onFocus} style={({ pressed }) => pressed && styles.pressed}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.checkinCard, shadow]}>
        <View style={styles.checkinCardInner}>
          <View style={[styles.checkinIcon, { backgroundColor: accent + '22', borderColor: accent + '44' }]}><Icon size={22} color={accent} /></View>
          <View style={styles.checkinCopy}>
            <View style={styles.checkinMeta}><Text style={[styles.checkinNumber, { color: accent }]}>{String(index + 1).padStart(2, '0')}</Text><Text style={styles.checkinSubtitle}>{subtitle}</Text></View>
            <Text style={[styles.checkinTitle, checked && styles.doneText]}>{task.title}</Text>
            <Text style={styles.checkinDetail}>{task.detail} · {task.duration} min</Text>
          </View>
          {checked ? (
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: true }} onPress={onCheck} style={[styles.checkButton, { backgroundColor: accent, borderColor: accent }]}><Check color={colors.canvas} size={16} strokeWidth={3} /></Pressable>
          ) : (
            <ChevronRight size={22} color={colors.muted} />
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function BusyTimeInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const [clock, setClock] = useState(() => timeParts12(value).clock);
  const { meridiem } = timeParts12(value);
  useEffect(() => { setClock(timeParts12(value).clock); }, [value]);
  const saveClock = (nextClock = clock, nextMeridiem = meridiem) => onChange(timeFrom12(nextClock, nextMeridiem, value));
  return <View style={styles.busyTimeField}>
    <Text style={styles.busyTimeLabel}>{label}</Text>
    <View style={styles.busyTimeControl}>
      <TextInput
        value={clock}
        onChangeText={setClock}
        onBlur={() => saveClock()}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        placeholder="09:00"
        placeholderTextColor={colors.muted}
        style={styles.busyTimeInput}
      />
      <View style={styles.busyMeridiem}>
        {(['AM', 'PM'] as Meridiem[]).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityLabel={`Set ${label} to ${option}`} onPress={() => saveClock(clock, option)} style={[styles.busyMeridiemOption, meridiem === option && styles.busyMeridiemOptionActive]}><Text style={[styles.busyMeridiemText, meridiem === option && styles.busyMeridiemTextActive]}>{option}</Text></Pressable>)}
      </View>
    </View>
  </View>;
}

function BusyRoutineEditor({ busySchedule, dailyMinutes, onChange }: { busySchedule: BusyBlock[]; dailyMinutes: number; onChange: (schedule: BusyBlock[], minutes: number) => void }) {
  const window = suggestedLearningWindow(busySchedule, dailyMinutes);
  const updateBlock = (id: string, patch: Partial<BusyBlock>) => onChange(busySchedule.map((block) => block.id === id ? { ...block, ...patch } : block), dailyMinutes);
  const addBlock = () => onChange([...busySchedule, { id: `busy-${Date.now()}`, title: 'Busy time', start: '09:00', end: '10:00' }], dailyMinutes);
  return <View style={styles.routineEditor}>
    <Text style={styles.fieldLabel}>WHEN ARE YOU BUSY?</Text>
    <Text style={styles.routineHint}>Add the times you cannot learn. VOKAI finds your best open window.</Text>
    {busySchedule.map((block) => <View style={styles.busyBlock} key={block.id}>
      <View style={styles.busyBlockTop}><TextInput value={block.title} onChangeText={(value) => updateBlock(block.id, { title: value || 'Busy time' })} placeholder="Work, class, commute…" placeholderTextColor={colors.muted} style={styles.busyTitleInput} /><Pressable accessibilityLabel="Remove busy time" onPress={() => onChange(busySchedule.filter((item) => item.id !== block.id), dailyMinutes)} style={styles.removeBusyButton}><Text style={styles.removeBusyText}>×</Text></Pressable></View>
      <View style={styles.busyTimeRow}><BusyTimeInput label="Start" value={block.start} onChange={(value) => updateBlock(block.id, { start: value })} /><Text style={styles.busyTo}>to</Text><BusyTimeInput label="End" value={block.end} onChange={(value) => updateBlock(block.id, { end: value })} /></View>
    </View>)}
    <Pressable onPress={addBlock} style={styles.addBusyButton}><Text style={styles.addBusyText}>+ Add busy time</Text></Pressable>
    <Text style={styles.fieldLabel}>DAILY LEARNING SESSION</Text>
    <View style={styles.chips}>{[30, 45, 60, 90].map((minutes) => <Pressable key={minutes} onPress={() => onChange(busySchedule, minutes)} style={[styles.durationChip, dailyMinutes === minutes && styles.chipActive]}><Text style={[styles.chipText, dailyMinutes === minutes && styles.chipTextActive]}>{minutes} min</Text></Pressable>)}</View>
    <View style={styles.suggestedWindow}><View><Text style={styles.suggestedEyebrow}>SUGGESTED LEARNING WINDOW</Text><Text style={styles.suggestedTime}>{formatTime12(window.start)} – {formatTime12(window.end)}</Text></View><MaterialCommunityIcons name="calendar-clock-outline" size={25} color={colors.forest} /></View>
  </View>;
}

function UserAvatar({ name, imageUrl, size }: { name: string; imageUrl?: string; size: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [imageUrl, name]);
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || '?')}&background=F6C75A&color=263A2B&bold=true&size=160`;
  if (failed) return <View style={[styles.userAvatarFallback, { width: size, height: size, borderRadius: size / 2 }]}><Text style={[styles.userAvatarFallbackText, { fontSize: Math.round(size * 0.42) }]}>{initial}</Text></View>;
  return <Image accessibilityLabel={`${name || 'User'} profile photo`} source={{ uri: imageUrl || fallbackUrl }} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.sun }} />;
}

function HomePage({ profile, progress, day, week, onToggleTask, onGarden, onFocus, onProfile, onSettings }: {
  profile: LearnerProfile; progress: Progress; day: number; week: RemoteCheckIn[]; onToggleTask: (taskId: string) => void; onGarden: () => void; onFocus: (task: LessonTask) => void; onProfile: () => void; onSettings: () => void;
}) {
  const tasks = tasksForDay(learningLanguage(profile), day, profile.experienceLevel);
  const completed = progress.tasksByDay[day] ?? [];
  const greeting = profile.name.trim().split(' ')[0] || 'coder';
  const history = week.length ? week : localWeek(day, progress);
  const calendarWeek = useMemo(() => calendarWeekTracker(history), [history]);
  const streak = useMemo(() => {
    let result = 0;
    for (let currentDay = day; currentDay >= 1 && progress.completedDays.includes(currentDay); currentDay -= 1) result += 1;
    return result;
  }, [day, progress.completedDays]);
  const nextMilestone = MILESTONES.find((milestone) => milestone.day > day);
  const previousMilestone = nextMilestone
    ? MILESTONES.filter((milestone) => milestone.day < nextMilestone.day).at(-1)?.day ?? 0
    : 90;
  const milestoneProgress = nextMilestone
    ? Math.min(100, Math.round(((day - previousMilestone) / (nextMilestone.day - previousMilestone)) * 100))
    : 100;
  return (
    <ScrollView contentContainerStyle={styles.checkinContent} showsVerticalScrollIndicator={false}>
      <View style={styles.checkinTopBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={onProfile} style={styles.profileLeft}><UserAvatar name={profile.name} imageUrl={profile.profileImageUrl} size={44} /><View><Text style={styles.profileGreeting}>Hey, {greeting}</Text><Text style={styles.profileHint}>View profile</Text></View></Pressable>
        <Pressable onPress={onSettings} style={[styles.checkinProgressPill, completed.length === 3 && styles.checkinProgressPillDone]}><Text style={[styles.checkinProgressText, completed.length === 3 && styles.checkinProgressTextDone]}>{completed.length} / 3 done</Text></Pressable>
      </View>

      <Pressable onPress={onGarden} style={({ pressed }) => [styles.clarioGardenCard, pressed && styles.pressed]}>
        <GardenScene dayCount={day} completedCount={completed.length} />
        <View style={styles.gardenTrackerRow}>
          <View style={styles.streakBadge}><Flame size={14} color={colors.amberRich} /><Text style={styles.streakNum}>{streak}</Text><Text style={styles.streakLabel}>day streak</Text></View>
          <View style={styles.weekDots}>{calendarWeek.map((calendarDay) => {
            const done = calendarDay.checkIn?.day_complete || (calendarDay.isToday && completed.length === 3);
            return <View style={styles.trackerDotCol} key={calendarDay.key}><View style={[styles.trackerDot, done && styles.trackerDotDone, calendarDay.isToday && styles.trackerDotToday, done && calendarDay.isToday && styles.trackerDotTodayDone]}>{done && <Check size={8} color="#fff" strokeWidth={3} />}</View><Text style={[styles.trackerDotLabel, calendarDay.isToday && styles.trackerDotLabelToday]}>{calendarDay.label}</Text></View>;
          })}</View>
          <View style={styles.gardenLink}><Sprout size={16} color={colors.forest} /><ChevronRight size={15} color={colors.muted} /></View>
        </View>
        {nextMilestone && <View style={styles.nextMilestoneRow}><View style={styles.nextMilestoneIcon}><Text>{nextMilestone.icon}</Text></View><View style={{ flex: 1 }}><View style={styles.milestoneTop}><Text style={styles.milestoneEyebrow}>NEXT UNLOCK</Text><Text style={styles.milestoneDays}>{nextMilestone.day - day} days to go</Text></View><Text style={styles.nextMilestoneTitle}>{nextMilestone.title}</Text><ProgressBar value={milestoneProgress} /></View></View>}
      </Pressable>

      <View style={styles.checkinMain}>
        <View style={styles.checkinHeader}><Text style={styles.eyebrow}>TODAY'S CODING</Text><Text style={styles.clarioTitle}>daily check-in</Text><Text style={styles.clarioSubtitle}>{learningLanguage(profile)} · three focused steps.</Text></View>
        <View style={styles.taskList}>{tasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} checked={completed.includes(task.id)} onCheck={() => onToggleTask(task.id)} onFocus={() => onFocus(task)} />)}</View>

        {completed.length === 3 && <View style={styles.allDoneBanner}><View style={styles.allDoneIcon}><Check color={colors.canvas} size={18} strokeWidth={3} /></View><View><Text style={styles.allDoneTitle}>All done for today</Text><Text style={styles.allDoneSub}>Your coding garden grew.</Text></View></View>}
      </View>
    </ScrollView>
  );
}

function RewardBalance({ coins, points }: { coins: number; points: number }) {
  return <View style={styles.rewardBalanceCard}>
    <View style={styles.rewardBalanceItem}><View style={[styles.rewardBalanceIcon, { backgroundColor: '#FFF1CC' }]}><MaterialCommunityIcons name="currency-usd" size={19} color="#A46719" /></View><View><Text style={styles.rewardBalanceLabel}>COINS</Text><Text style={styles.rewardBalanceValue}>{coins}</Text></View></View>
    <View style={styles.rewardBalanceDivider} />
    <View style={styles.rewardBalanceItem}><View style={[styles.rewardBalanceIcon, { backgroundColor: colors.mint }]}><MaterialCommunityIcons name="star-four-points-outline" size={19} color={colors.forest} /></View><View><Text style={styles.rewardBalanceLabel}>POINTS</Text><Text style={styles.rewardBalanceValue}>{points}</Text></View></View>
  </View>;
}

function ProfilePage({ profile, email, userCode, progress, day, week, friends, coins, points, onBack, onFriends, onUploadPhoto }: {
  profile: LearnerProfile;
  email: string;
  userCode: string | null;
  progress: Progress;
  day: number;
  week: RemoteCheckIn[];
  friends: Friend[];
  coins: number;
  points: number;
  onBack: () => void;
  onFriends: () => void;
  onUploadPhoto: (uri: string, mimeType?: string | null) => Promise<boolean>;
}) {
  const firstName = profile.name.trim().split(' ')[0] || 'Coder';
  const completedToday = progress.tasksByDay[day]?.length ?? 0;
  const history = week.length ? week : localWeek(day, progress);
  const calendarWeek = useMemo(() => calendarWeekTracker(history), [history]);
  const streak = useMemo(() => {
    let result = 0;
    for (let currentDay = day; currentDay >= 1 && progress.completedDays.includes(currentDay); currentDay -= 1) result += 1;
    return result;
  }, [day, progress.completedDays]);
  const unlocked = MILESTONES.filter((milestone) => milestone.day <= day);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const chooseProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    setUploadingPhoto(true);
    const uploaded = await onUploadPhoto(result.assets[0].uri, result.assets[0].mimeType);
    setUploadingPhoto(false);
    if (!uploaded) Alert.alert('Photo not uploaded', 'Please check your connection and try again.');
  };
  return <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <View style={styles.topRow}><IconButton label="Back to today" onPress={onBack}><ArrowLeft color={colors.ink} size={21} /></IconButton><Text style={styles.settingsTopLabel}>MY PROFILE</Text><View style={{ width: 42 }} /></View>
    <View style={styles.profileHero}>
      <Pressable accessibilityRole="button" accessibilityLabel="Choose a profile photo" disabled={uploadingPhoto} onPress={() => void chooseProfilePhoto()} style={styles.profilePhotoButton}><UserAvatar name={profile.name} imageUrl={profile.profileImageUrl} size={61} /><View style={styles.profilePhotoEdit}><MaterialCommunityIcons name={uploadingPhoto ? 'loading' : 'camera-outline'} size={13} color="#fff" /></View></Pressable>
      <View style={{ flex: 1 }}><Text style={styles.eyebrow}>CODING GARDENER</Text><Text style={styles.profileHeroName}>{profile.name || 'Coder'}</Text><Text style={styles.profileHeroLanguage}>{learningLanguage(profile)} · {profile.experienceLevel}</Text></View>
    </View>

    <View style={styles.profileIdCard}><View><Text style={styles.profileIdLabel}>YOUR VOKAI ID</Text><Text style={styles.profileIdValue}>{userCode ?? 'Creating your ID…'}</Text><Text style={styles.profileIdSub}>A unique 10-digit ID for your VOKAI account.</Text></View><View style={styles.profileIdIcon}><MaterialCommunityIcons name="card-account-details-outline" size={25} color={colors.forest} /></View></View>
    <View style={styles.profileEmailCard}><View style={styles.profileEmailIcon}><MaterialCommunityIcons name="email-outline" size={18} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.profileEmailLabel}>ACCOUNT EMAIL</Text><Text numberOfLines={1} style={styles.profileEmailValue}>{email || 'No email available'}</Text></View><MaterialCommunityIcons name="lock-outline" size={17} color={colors.muted} /></View>

    <View style={styles.profileSectionRow}><Text style={styles.profileSectionTitle}>your rewards</Text><Text style={styles.profileSectionMeta}>Earned from check-ins</Text></View>
    <RewardBalance coins={coins} points={points} />
    <View style={styles.rewardHint}><MaterialCommunityIcons name="gift-outline" size={17} color={colors.forest} /><Text style={styles.rewardHintText}>Every completed day earns 10 coins + 5 points. Bonus rewards unlock on days 2, 3, 4, 10, and 60.</Text></View>

    <Text style={styles.profileSectionTitle}>your journey</Text>
    <View style={styles.profileStatsGrid}><Stat number={`Day ${day}`} label="of 90 days" /><Stat number={streak} label="day streak" /><Stat number={`${completedToday}/3`} label="today done" /></View>
    <View style={styles.profileLanguageCard}><View style={styles.profileLanguageIcon}><MaterialCommunityIcons name="code-tags" size={21} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.profileLanguageTitle}>{learningLanguage(profile)}</Text><Text style={styles.profileLanguageSub}>{profile.experienceLevel.charAt(0).toUpperCase() + profile.experienceLevel.slice(1)} learner · {profile.dailyMinutes} min daily plan</Text></View></View>

    <View style={styles.profileSectionRow}><Text style={styles.profileSectionTitle}>daily check-ins</Text><Text style={styles.profileSectionMeta}>Day {day}</Text></View>
    <View style={styles.profileCheckinCard}>{calendarWeek.map((calendarDay) => {
      const done = calendarDay.checkIn?.day_complete || (calendarDay.isToday && completedToday === 3);
      return <View style={styles.profileCheckinDay} key={calendarDay.key}><View style={[styles.profileCheckinDot, done && styles.profileCheckinDotDone, calendarDay.isToday && styles.profileCheckinDotToday]}>{done && <Check size={12} color="#fff" />}</View><Text style={[styles.profileCheckinLabel, calendarDay.isToday && styles.profileCheckinLabelToday]}>{calendarDay.isToday ? 'Today' : calendarDay.label}</Text></View>;
    })}</View>

    <View style={styles.profileSectionRow}><Text style={styles.profileSectionTitle}>friends</Text><Pressable accessibilityRole="button" accessibilityLabel="Open friends" onPress={onFriends}><Text style={styles.profileSectionLink}>See all</Text></Pressable></View>
    {friends.length === 0 ? <Pressable onPress={onFriends} style={styles.profileFriendsEmpty}><MaterialCommunityIcons name="account-plus-outline" size={20} color={colors.forest} /><Text style={styles.profileFriendsEmptyText}>Add friends to share your learning journey.</Text><ChevronRight size={18} color={colors.muted} /></Pressable> : <Pressable onPress={onFriends} style={styles.profileFriendsCard}>{friends.slice(0, 4).map((friend) => <View key={friend.id} style={styles.profileFriendAvatar}><Text style={styles.profileFriendAvatarText}>{friend.name.charAt(0).toUpperCase()}</Text></View>)}{friends.length > 4 && <View style={styles.profileFriendMore}><Text style={styles.profileFriendMoreText}>+{friends.length - 4}</Text></View>}<Text style={styles.profileFriendsText}>{friends.length} {friends.length === 1 ? 'friend' : 'friends'} learning with you</Text><ChevronRight size={18} color={colors.muted} /></Pressable>}

    <View style={styles.profileSectionRow}><Text style={styles.profileSectionTitle}>garden achievements</Text><Text style={styles.profileSectionMeta}>{unlocked.length}/{MILESTONES.length} unlocked</Text></View>
    <View style={styles.profileAchievementsCard}>{MILESTONES.map((milestone) => {
      const achieved = milestone.day <= day;
      return <View key={milestone.day} style={[styles.profileAchievement, !achieved && styles.profileAchievementLocked]}><View style={[styles.profileAchievementIcon, achieved && styles.profileAchievementIconDone]}><Text>{achieved ? '✓' : milestone.icon}</Text></View><Text style={[styles.profileAchievementTitle, !achieved && styles.profileAchievementTitleLocked]}>{milestone.title}</Text><Text style={styles.profileAchievementDay}>D{milestone.day}</Text></View>;
    })}</View>
  </ScrollView>;
}

function FriendProfilePage({ friend, onBack }: { friend: FriendProfile; onBack: () => void }) {
  const calendarWeek = useMemo(() => calendarWeekTracker(friend.week), [friend.week]);
  return <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <View style={styles.topRow}><IconButton label="Back to friends" onPress={onBack}><ArrowLeft color={colors.ink} size={21} /></IconButton><Text style={styles.settingsTopLabel}>FRIEND PROFILE</Text><View style={{ width: 42 }} /></View>
    <View style={styles.friendProfileHero}><UserAvatar name={friend.name} imageUrl={friend.profile_image_url ?? undefined} size={68} /><View style={{ flex: 1 }}><Text style={styles.eyebrow}>LEARNING BUDDY</Text><Text style={styles.profileHeroName}>{friend.name}</Text><Text style={styles.profileHeroLanguage}>{friend.language} · {friend.experience_level}</Text></View></View>
    <RewardBalance coins={friend.coins} points={friend.points} />
    <Text style={styles.profileSectionTitle}>their journey</Text>
    <View style={styles.profileStatsGrid}><Stat number={`Day ${friend.journey_day}`} label="of 90 days" /><Stat number={friend.current_streak} label="day streak" /><Stat number={friend.completed_days} label="days checked in" /></View>
    <View style={styles.profileLanguageCard}><View style={styles.profileLanguageIcon}><MaterialCommunityIcons name="code-tags" size={21} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.profileLanguageTitle}>{friend.language}</Text><Text style={styles.profileLanguageSub}>{friend.experience_level.charAt(0).toUpperCase() + friend.experience_level.slice(1)} learner · {friend.daily_minutes} min daily plan</Text></View></View>
    <View style={styles.profileSectionRow}><Text style={styles.profileSectionTitle}>daily check-ins</Text><Text style={styles.profileSectionMeta}>{friend.current_streak} day streak</Text></View>
    <View style={styles.profileCheckinCard}>{calendarWeek.map((calendarDay) => <View style={styles.profileCheckinDay} key={calendarDay.key}><View style={[styles.profileCheckinDot, calendarDay.checkIn?.day_complete && styles.profileCheckinDotDone, calendarDay.isToday && styles.profileCheckinDotToday]}>{calendarDay.checkIn?.day_complete && <Check size={12} color="#fff" />}</View><Text style={[styles.profileCheckinLabel, calendarDay.isToday && styles.profileCheckinLabelToday]}>{calendarDay.isToday ? 'Today' : calendarDay.label}</Text></View>)}</View>
    <View style={styles.profileSectionRow}><Text style={styles.profileSectionTitle}>garden achievements</Text><Text style={styles.profileSectionMeta}>{friend.unlocked.length}/{MILESTONES.length} unlocked</Text></View>
    <View style={styles.profileAchievementsCard}>{MILESTONES.map((milestone) => {
      const achieved = friend.unlocked.some((unlocked) => unlocked.day === milestone.day);
      return <View key={milestone.day} style={[styles.profileAchievement, !achieved && styles.profileAchievementLocked]}><View style={[styles.profileAchievementIcon, achieved && styles.profileAchievementIconDone]}><Text>{achieved ? '✓' : milestone.icon}</Text></View><Text style={[styles.profileAchievementTitle, !achieved && styles.profileAchievementTitleLocked]}>{milestone.title}</Text><Text style={styles.profileAchievementDay}>D{milestone.day}</Text></View>;
    })}</View>
  </ScrollView>;
}

function CoachInlineText({ text }: { text: string }) {
  const pieces = text.replace(/^- /gm, '• ').split(/(\*\*[^*]+\*\*)/g);
  return <Text style={styles.focusMessageText}>{pieces.map((piece, index) => piece.startsWith('**') && piece.endsWith('**') ? <Text key={`${piece}-${index}`} style={styles.coachStrongText}>{piece.slice(2, -2)}</Text> : piece)}</Text>;
}

function CoachReply({ text }: { text: string }) {
  const sections = text.split(/```([\s\S]*?)```/g);
  return <View style={styles.coachReply}>
    {sections.map((section, index) => {
      if (index % 2 === 0) return section.trim() ? <CoachInlineText key={`copy-${index}`} text={section.trim()} /> : null;
      const lines = section.trim().split('\n');
      const language = /^(javascript|typescript|python|java|c\+\+|cpp|rust|kotlin|jsx|tsx|html|css|json|bash|sql)$/i.test(lines[0]) ? lines.shift()! : 'code';
      return <View key={`code-${index}`} style={styles.coachCodeBlock}>
        <View style={styles.coachCodeHeader}><MaterialCommunityIcons name="code-tags" size={13} color="#CFE1CB" /><Text style={styles.coachCodeLanguage}>{language.toUpperCase()}</Text></View>
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coachCodeScroll}><Text selectable style={styles.coachCodeText}>{lines.join('\n').trim()}</Text></ScrollView>
      </View>;
    })}
  </View>;
}

function FocusPage({ task, profile, day, completedCount, completed, accessToken, onBack, onComplete }: {
  task: LessonTask;
  profile: LearnerProfile;
  day: number;
  completedCount: number;
  completed: boolean;
  accessToken: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const chatScrollRef = React.useRef<ScrollView>(null);
  const draftBeforeVoiceRef = React.useRef('');
  const quickPrompts = [
    'What should I do now?',
    'Break this into small steps',
    'Plan my next 20 minutes',
    'Help me get unstuck',
  ];
  useEffect(() => {
    setDraft('');
    setMessages([{
      id: `welcome-${day}-${task.id}`,
      role: 'assistant',
      text: `**Definition**\nYour next tiny job is “${task.title}.”\n\n**Example**\nOpen your lesson and do one small piece first.\n\n**Why we use it**\nSmall steps make a big task feel easier.\n\n**Workflow**\n1. Read the task.\n2. Ask me for help.\n3. Mark it done.\n\n**Code**\nNo code is needed for this small step.`,
    }]);
  }, [day, task.id, task.title]);
  useEffect(() => {
    chatScrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, sending]);
  useEffect(() => {
    const speech = speechRecognitionModule;
    if (!speech) return;
    const subscriptions = [
      speech.addListener('start', () => {
        setListening(true);
        setVoiceStatus('Listening… Tap the microphone when you are finished.');
      }),
      speech.addListener('end', () => {
        setListening(false);
        setVoiceStatus(null);
      }),
      speech.addListener('result', (event: { results?: Array<{ transcript?: string }> }) => {
        const transcript = event.results?.[0]?.transcript?.trim();
        if (!transcript) return;
        const prefix = draftBeforeVoiceRef.current;
        setDraft(prefix ? `${prefix} ${transcript}` : transcript);
      }),
      speech.addListener('error', (event: { error?: string }) => {
        setListening(false);
        if (event.error === 'aborted') return;
        setVoiceStatus(event.error === 'no-speech' || event.error === 'speech-timeout' ? 'I did not hear anything. Try speaking again.' : 'Voice typing is unavailable. Check your microphone permission and try again.');
      }),
    ];
    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      speech.abort();
    };
  }, []);
  const toggleVoiceInput = async () => {
    if (sending) return;
    if (!speechRecognitionModule) {
      setVoiceStatus('Voice typing needs a rebuilt VOKAI development app. Run npm run android, then open that app instead of Expo Go.');
      return;
    }
    if (listening) {
      speechRecognitionModule.stop();
      return;
    }
    if (!speechRecognitionModule.isRecognitionAvailable()) {
      setVoiceStatus('Speech recognition is not available on this device.');
      return;
    }
    const permission = await speechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setVoiceStatus('Allow microphone and speech recognition access to use voice typing.');
      return;
    }
    draftBeforeVoiceRef.current = draft.trim();
    speechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false, addsPunctuation: true, iosTaskHint: 'dictation' });
  };
  const sendMessage = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    const userMessage: CoachMessage = { id: `user-${Date.now()}`, role: 'user', text: message };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setDraft('');
    setSending(true);
    const result = await askFocusCoach(accessToken, conversation.map(({ role, text: messageText }) => ({ role, text: messageText })), task);
    setMessages((previous) => [...previous, {
      id: `coach-${Date.now()}`,
      role: 'assistant',
      text: result?.reply ?? 'I could not reach your focus coach just now. Start with the smallest visible step in this task, then ask me again when the connection is back.',
    }]);
    setSending(false);
  };
  return (
    <KeyboardAvoidingView style={styles.focusPage} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.focusHeader}>
        <IconButton label="Back to plan" onPress={onBack}><ArrowLeft color={colors.ink} size={21} /></IconButton>
        <View style={styles.focusHeaderIdentity}>
          <View style={styles.focusCoachAvatar}><MaterialCommunityIcons name="robot-happy-outline" size={22} color={colors.forest} /></View>
          <View style={styles.focusCoachIntroCopy}><Text style={styles.focusChatTitle}>VOKAI coach</Text><Text style={styles.focusChatSub}>{learningLanguage(profile)} · Day {day} · {completedCount}/3 done</Text></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={completed ? 'Task complete' : 'Mark task complete'} accessibilityState={{ disabled: completed }} disabled={completed} onPress={onComplete} style={[styles.focusCompleteButton, completed && styles.focusCompleteButtonDone]}>
          <MaterialCommunityIcons name={completed ? 'check' : 'check-circle-outline'} size={20} color={completed ? '#fff' : colors.forest} />
        </Pressable>
      </View>

      <View style={styles.focusTaskContext}>
        <MaterialCommunityIcons name="code-tags" size={15} color={colors.forest} />
        <Text numberOfLines={1} style={styles.focusTaskContextText}>Helping with: {task.title}</Text>
        <Text style={styles.focusTaskMinutes}>{task.duration} min</Text>
      </View>

      <ScrollView ref={chatScrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })} style={styles.focusMessageScroll} contentContainerStyle={styles.focusMessageList}>{messages.map((message) => <View key={message.id} style={[styles.focusMessage, message.role === 'user' ? styles.focusMessageUser : styles.focusMessageCoach]}>{message.role === 'assistant' ? <CoachReply text={message.text} /> : <Text style={[styles.focusMessageText, styles.focusMessageTextUser]}>{message.text}</Text>}</View>)}{sending && <View style={[styles.focusMessage, styles.focusMessageCoach, styles.focusTyping]}><MaterialCommunityIcons name="dots-horizontal" size={24} color={colors.forest} /></View>}</ScrollView>

      <View style={styles.focusBottom}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.focusPromptWrap}>{quickPrompts.map((prompt) => <Pressable disabled={sending} key={prompt} onPress={() => void sendMessage(prompt)} style={[styles.focusPrompt, sending && styles.focusPromptDisabled]}><Text style={styles.focusPromptText}>{prompt}</Text><MaterialCommunityIcons name="arrow-top-right" size={14} color={colors.forest} /></Pressable>)}</ScrollView>
        <View style={styles.focusComposer}><TextInput value={draft} onChangeText={setDraft} editable={!sending} onSubmitEditing={() => void sendMessage(draft)} placeholder="Message VOKAI coach" placeholderTextColor={colors.muted} style={styles.focusComposerInput} returnKeyType="send" multiline scrollEnabled /><Pressable accessibilityRole="button" accessibilityLabel={listening ? 'Stop voice typing' : 'Start voice typing'} accessibilityState={{ selected: listening }} disabled={sending} onPress={() => void toggleVoiceInput()} style={[styles.focusVoiceButton, listening && styles.focusVoiceButtonListening, sending && styles.focusVoiceButtonDisabled]}><MaterialCommunityIcons name={listening ? 'stop' : 'microphone'} size={20} color={listening ? '#fff' : colors.forest} /></Pressable><Pressable accessibilityLabel="Send message" disabled={!draft.trim() || sending} onPress={() => void sendMessage(draft)} style={[styles.focusSendButton, (!draft.trim() || sending) && styles.focusSendButtonDisabled]}><MaterialCommunityIcons name="arrow-up" size={21} color="#fff" /></Pressable></View>
        {!!voiceStatus && <Text accessibilityLiveRegion="polite" style={[styles.focusVoiceStatus, listening ? styles.focusVoiceStatusListening : styles.focusVoiceStatusError]}>{voiceStatus}</Text>}
        <Text style={styles.focusDisclaimer}>VOKAI can make mistakes. Check important coding details.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function ScheduleManagerPage({ profile, onChange, onBack }: { profile: LearnerProfile; onChange: (next: LearnerProfile) => void; onBack: () => void }) {
  const [entryMode, setEntryMode] = useState<'busy' | 'voice'>('busy');
  const [routineNote, setRoutineNote] = useState(profile.routineNote);
  const plan = useMemo(() => dailySchedulePlan(profile), [profile]);
  useEffect(() => { setRoutineNote(profile.routineNote); }, [profile.routineNote]);
  const updateRoutine = (busySchedule: BusyBlock[], dailyMinutes: number) => {
    const window = suggestedLearningWindow(busySchedule, dailyMinutes);
    onChange({ ...profile, busySchedule, dailyMinutes, freeTime: window.start });
  };
  const saveRoutineNote = () => onChange({ ...profile, routineNote: routineNote.trim() });
  return <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <View style={styles.topRow}><IconButton label="Back to settings" onPress={onBack}><ArrowLeft color={colors.ink} size={21} /></IconButton><Text style={styles.settingsTopLabel}>SCHEDULE</Text><View style={{ width: 42 }} /></View>
    <Heading eyebrow="SCHEDULE MANAGER" title="Make time for coding." sub={`Your fixed ${learningLanguage(profile)} path is planned around your ${profile.experienceLevel} level.`} />
    <View style={styles.scheduleHero}><View style={styles.scheduleHeroIcon}><MaterialCommunityIcons name="calendar-clock-outline" size={24} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.scheduleHeroTitle}>Your routine, protected</Text><Text style={styles.scheduleHeroSub}>Add busy times or dictate your full weekly routine. VOKAI keeps the best daily window saved.</Text></View></View>
    <View style={styles.scheduleModeRow}>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: entryMode === 'busy' }} onPress={() => setEntryMode('busy')} style={[styles.scheduleMode, entryMode === 'busy' && styles.scheduleModeActive]}><MaterialCommunityIcons name="clock-outline" size={17} color={entryMode === 'busy' ? '#fff' : colors.forest} /><Text style={[styles.scheduleModeText, entryMode === 'busy' && styles.scheduleModeTextActive]}>Busy times</Text></Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: entryMode === 'voice' }} onPress={() => setEntryMode('voice')} style={[styles.scheduleMode, entryMode === 'voice' && styles.scheduleModeActive]}><MaterialCommunityIcons name="microphone-outline" size={17} color={entryMode === 'voice' ? '#fff' : colors.forest} /><Text style={[styles.scheduleModeText, entryMode === 'voice' && styles.scheduleModeTextActive]}>Voice routine</Text></Pressable>
    </View>
    {entryMode === 'voice' && <View style={styles.routineNoteCard}><View style={styles.routineNoteHead}><View style={styles.routineNoteIcon}><MaterialCommunityIcons name="microphone-outline" size={18} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.routineNoteTitle}>Describe your routine</Text><Text style={styles.routineNoteSub}>Tap the box, then use the microphone on your phone keyboard to dictate.</Text></View></View><TextInput value={routineNote} onChangeText={setRoutineNote} onBlur={saveRoutineNote} multiline textAlignVertical="top" placeholder="For example: I have class from 9 AM to 3 PM, commute until 4 PM, and prefer focused coding after dinner…" placeholderTextColor={colors.muted} style={styles.routineNoteInput} /><Pressable onPress={() => Alert.alert('Use phone dictation', 'Tap the routine box, then tap the microphone on your phone keyboard. Your spoken words will appear here and save to your VOKAI schedule.')} style={styles.dictationHelp}><MaterialCommunityIcons name="microphone-outline" size={15} color={colors.forest} /><Text style={styles.dictationHelpText}>How to use voice input</Text></Pressable><Pressable onPress={saveRoutineNote} style={styles.saveRoutineButton}><MaterialCommunityIcons name="content-save-outline" size={16} color="#fff" /><Text style={styles.saveRoutineButtonText}>Save routine</Text></Pressable></View>}
    <View style={styles.scheduleCard}><BusyRoutineEditor busySchedule={profile.busySchedule} dailyMinutes={profile.dailyMinutes} onChange={updateRoutine} /></View>
    <View style={styles.schedulePlanHeader}><View><Text style={styles.schedulePlanEyebrow}>YOUR DAILY PLAN</Text><Text style={styles.schedulePlanTitle}>Best time: {formatTime12(profile.freeTime)}</Text></View><View style={styles.schedulePlanBadge}><Text style={styles.schedulePlanBadgeText}>{profile.dailyMinutes} MIN</Text></View></View>
    <View style={styles.schedulePlanCard}>{plan.map((item, index) => <View key={item.title} style={[styles.schedulePlanItem, index !== plan.length - 1 && styles.schedulePlanDivider]}><Text style={styles.schedulePlanTime}>{item.time}</Text><View style={styles.schedulePlanIcon}><MaterialCommunityIcons name={item.icon} size={17} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.schedulePlanItemTitle}>{item.title}</Text><Text style={styles.schedulePlanItemSub}>{item.detail}</Text></View></View>)}</View>
  </ScrollView>;
}

function FriendAvatar({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  return <UserAvatar name={name} imageUrl={imageUrl ?? undefined} size={43} />;
}

function FriendsPage({ friends, requests, loading, onRefresh, onSendRequest, onRespond, onRemove, onVisit, onLeaderboard }: {
  friends: Friend[];
  requests: FriendRequest[];
  loading: boolean;
  onRefresh: () => Promise<boolean>;
  onSendRequest: (email: string) => Promise<boolean>;
  onRespond: (requesterId: string, action: 'accept' | 'decline') => Promise<boolean>;
  onRemove: (friendId: string) => Promise<boolean>;
  onVisit: (friend: Friend) => void;
  onLeaderboard: () => void;
}) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const sendRequest = async () => {
    const cleanEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      Alert.alert('Enter an email', 'Use the email address your friend uses for their VOKAI account.');
      return;
    }
    setSubmitting(true);
    const sent = await onSendRequest(cleanEmail);
    setSubmitting(false);
    if (sent) {
      setEmail('');
      Alert.alert('Request sent', 'Your friend will appear here once they accept.');
    } else {
      Alert.alert('Could not send request', 'Check that your friend has a VOKAI account and try again.');
    }
  };
  const respond = async (requesterId: string, action: 'accept' | 'decline') => {
    setRespondingId(requesterId);
    const updated = await onRespond(requesterId, action);
    setRespondingId(null);
    if (!updated) Alert.alert('Could not update request', 'Please refresh and try again.');
  };
  const remove = (friend: Friend) => Alert.alert(
    'Remove friend?',
    `${friend.name} will no longer be in your friends list.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void onRemove(friend.id) },
    ],
  );
  return <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <View style={styles.topRow}>
      <View style={styles.friendsTopIdentity}><View style={styles.friendsTopIcon}><MaterialCommunityIcons name="account-group-outline" size={20} color={colors.forest} /></View><Text style={styles.settingsTopLabel}>FRIENDS</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh friends" disabled={loading} onPress={() => void onRefresh()} style={[styles.friendsRefreshButton, loading && styles.friendsRefreshButtonDisabled]}><MaterialCommunityIcons name={loading ? 'loading' : 'refresh'} size={19} color={colors.forest} /></Pressable>
    </View>
    <Heading eyebrow="LEARNING TOGETHER" title="your coding circle" sub="Add VOKAI friends, celebrate their streaks, and keep each other going." />

    <Pressable accessibilityRole="button" accessibilityLabel="Open the points leaderboard" onPress={onLeaderboard} style={styles.leaderboardLaunchCard}>
      <View style={styles.leaderboardLaunchIcon}><MaterialCommunityIcons name="city-variant-outline" size={25} color="#fff" /></View>
      <View style={{ flex: 1 }}><Text style={styles.leaderboardLaunchEyebrow}>POINTS LEADERBOARD</Text><Text style={styles.leaderboardLaunchTitle}>Explore your learning city</Text><Text style={styles.leaderboardLaunchSub}>Every friend gets a building. More points make it taller.</Text></View>
      <View style={styles.leaderboardLaunchArrow}><ChevronRight size={22} color={colors.forest} /></View>
    </Pressable>

    <View style={styles.addFriendCard}>
      <View style={styles.addFriendHeading}><View style={styles.addFriendIcon}><MaterialCommunityIcons name="account-plus-outline" size={19} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.addFriendTitle}>Add a friend</Text><Text style={styles.addFriendSub}>Send a request using their VOKAI account email.</Text></View></View>
      <View style={styles.addFriendForm}><TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} onSubmitEditing={() => void sendRequest()} editable={!submitting} placeholder="friend@example.com" placeholderTextColor={colors.muted} style={styles.addFriendInput} returnKeyType="send" /><Pressable accessibilityRole="button" accessibilityLabel="Send friend request" disabled={submitting} onPress={() => void sendRequest()} style={[styles.addFriendButton, submitting && styles.addFriendButtonDisabled]}><MaterialCommunityIcons name={submitting ? 'loading' : 'send-outline'} size={18} color="#fff" /></Pressable></View>
    </View>

    {requests.length > 0 && <>
      <View style={styles.friendsSectionTitleRow}><Text style={styles.friendsSectionTitle}>friend requests</Text><View style={styles.requestCount}><Text style={styles.requestCountText}>{requests.length}</Text></View></View>
      <View style={styles.friendListCard}>{requests.map((request, index) => <View key={request.id} style={[styles.requestRow, index !== requests.length - 1 && styles.friendRowDivider]}><FriendAvatar name={request.name} imageUrl={request.profile_image_url} /><View style={styles.friendCopy}><Text style={styles.friendName}>{request.name}</Text><Text style={styles.friendMeta}>{request.language} · Day {request.journey_day} · {request.current_streak} day streak</Text></View><View style={styles.requestActions}><Pressable accessibilityRole="button" accessibilityLabel={`Accept ${request.name}'s friend request`} disabled={respondingId === request.id} onPress={() => void respond(request.id, 'accept')} style={[styles.acceptFriendButton, respondingId === request.id && styles.friendActionDisabled]}><MaterialCommunityIcons name="check" size={17} color="#fff" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Decline ${request.name}'s friend request`} disabled={respondingId === request.id} onPress={() => void respond(request.id, 'decline')} style={[styles.declineFriendButton, respondingId === request.id && styles.friendActionDisabled]}><MaterialCommunityIcons name="close" size={17} color={colors.red} /></Pressable></View></View>)}</View>
    </>}

    <View style={styles.friendsSectionTitleRow}><Text style={styles.friendsSectionTitle}>your friends</Text><Text style={styles.friendTotal}>{friends.length} {friends.length === 1 ? 'friend' : 'friends'}</Text></View>
    {loading && friends.length === 0 ? <View style={styles.friendsEmpty}><MaterialCommunityIcons name="loading" size={27} color={colors.forest} /><Text style={styles.friendsEmptyTitle}>Loading your circle…</Text></View> : friends.length === 0 ? <View style={styles.friendsEmpty}><View style={styles.friendsEmptyIcon}><MaterialCommunityIcons name="account-heart-outline" size={26} color={colors.forest} /></View><Text style={styles.friendsEmptyTitle}>Invite a learning buddy</Text><Text style={styles.friendsEmptySub}>When they accept your request, their VOKAI journey and current streak will show up here.</Text></View> : <View style={styles.friendListCard}>{friends.map((friend, index) => <View key={friend.id} style={[styles.friendRow, index !== friends.length - 1 && styles.friendRowDivider]}><Pressable accessibilityRole="button" accessibilityLabel={`View ${friend.name}'s profile`} onPress={() => onVisit(friend)} style={styles.friendVisit}><FriendAvatar name={friend.name} imageUrl={friend.profile_image_url} /><View style={styles.friendCopy}><Text style={styles.friendName}>{friend.name}</Text><Text style={styles.friendMeta}>{friend.language}</Text><View style={styles.friendStats}><View style={styles.friendStatPill}><MaterialCommunityIcons name="calendar-blank-outline" size={12} color={colors.forest} /><Text style={styles.friendStatText}>Day {friend.journey_day}</Text></View><View style={styles.friendStatPill}><MaterialCommunityIcons name="fire" size={12} color="#B66D22" /><Text style={styles.friendStatText}>{friend.current_streak} streak</Text></View></View></View><ChevronRight size={21} color={colors.muted} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${friend.name} from friends`} onPress={() => remove(friend)} style={styles.removeFriendButton}><MaterialCommunityIcons name="account-minus-outline" size={18} color={colors.muted} /></Pressable></View>)}</View>}
  </ScrollView>;
}

function LeaderboardPage({ profile, points, friends, onBack, onOpenFriend, onOpenSelf }: {
  profile: LearnerProfile;
  points: number;
  friends: Friend[];
  onBack: () => void;
  onOpenFriend: (friend: Friend) => void;
  onOpenSelf: () => void;
}) {
  const entries = useMemo<LeaderboardEntry[]>(() => [
    { id: 'me', name: profile.name || 'You', points, profileImageUrl: profile.profileImageUrl, isCurrentUser: true },
    ...friends.map((friend) => ({ id: friend.id, name: friend.name, points: friend.points ?? 0, profileImageUrl: friend.profile_image_url ?? undefined })),
  ], [friends, points, profile.name, profile.profileImageUrl]);
  const openEntry = (entry: LeaderboardEntry) => {
    if (entry.isCurrentUser) {
      onOpenSelf();
      return;
    }
    const friend = friends.find((candidate) => candidate.id === entry.id);
    if (friend) onOpenFriend(friend);
  };
  const ranked = [...entries].sort((left, right) => right.points - left.points || left.name.localeCompare(right.name));
  const maxPoints = Math.max(...ranked.map((entry) => entry.points), 1);
  const rankColor = (index: number) => ['#FFA116', '#C0C0C0', '#818CF8', '#2CBB5D', '#FB923C', '#22D3EE'][index % 6];
  return <ScrollView style={styles.leaderboardScreen} contentContainerStyle={styles.leaderboardContent} showsVerticalScrollIndicator={false}>
    <View style={styles.leaderboardTopRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to friends" onPress={onBack} style={styles.leaderboardBack}><ArrowLeft color={colors.ink} size={21} /></Pressable>
      <View style={styles.leaderboardTopIdentity}><View style={styles.leaderboardTopIcon}><MaterialCommunityIcons name="trophy-outline" size={18} color="#C47A17" /></View><View><Text style={styles.leaderboardTopEyebrow}>YOUR LEARNING CIRCLE</Text><Text style={styles.leaderboardTopTitle}>Live leaderboard</Text></View></View>
      <View style={styles.leaderboardTopLive}><View style={styles.leaderboardTopLiveDot} /><Text style={styles.leaderboardTopLiveText}>LIVE</Text></View>
    </View>
    <View style={styles.leaderboardHero}><Text style={styles.leaderboardHeroEyebrow}>GLOBAL STANDINGS</Text><Text style={styles.leaderboardHeroTitle}>score city</Text><Text style={styles.leaderboardHeroSub}>Your learning points build the city. Drag the scene to explore every tower.</Text></View>
    <LeaderboardCity entries={entries} onSelect={openEntry} />
    <View style={styles.leaderboardPrivacyNote}><MaterialCommunityIcons name="shield-check-outline" size={16} color="#2CBB5D" /><Text style={styles.leaderboardPrivacyText}>Only you and accepted friends appear in this private leaderboard.</Text></View>
    <View style={styles.leaderboardRankHeading}><View><Text style={styles.leaderboardRankTitle}>city rankings</Text><Text style={styles.leaderboardRankSub}>Live points · tallest scores</Text></View><View style={styles.leaderboardRankCount}><Text style={styles.leaderboardRankCountText}>{ranked.length}</Text></View></View>
    <View style={styles.leaderboardRankList}>{ranked.map((entry, index) => <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`View ${entry.name}'s building`} onPress={() => openEntry(entry)} style={[styles.leaderboardRankRow, index !== ranked.length - 1 && styles.leaderboardRankDivider, entry.isCurrentUser && styles.leaderboardRankRowCurrent]}><View style={[styles.leaderboardRankNumber, { borderColor: rankColor(index) }]}><Text style={[styles.leaderboardRankNumberText, { color: rankColor(index) }]}>{index + 1}</Text></View><UserAvatar name={entry.name} imageUrl={entry.profileImageUrl} size={39} /><View style={{ flex: 1, minWidth: 0 }}><View style={styles.leaderboardNameRow}><Text numberOfLines={1} style={styles.leaderboardRankName}>{entry.isCurrentUser ? 'You' : entry.name}</Text>{index === 0 && <MaterialCommunityIcons name="crown" size={13} color="#FFA116" />}</View><Text style={styles.leaderboardRankMeta}>{index === 0 ? 'Grand tower' : `Rank ${index + 1} tower`}</Text><View style={styles.leaderboardBarTrack}><View style={[styles.leaderboardBarFill, { width: `${Math.max(5, (entry.points / maxPoints) * 100)}%`, backgroundColor: rankColor(index) }]} /></View></View><View style={styles.leaderboardPointPill}><MaterialCommunityIcons name="star-four-points" size={12} color={entry.isCurrentUser ? '#FFA116' : '#2CBB5D'} /><Text style={styles.leaderboardPointText}>{entry.points.toLocaleString()}</Text></View></Pressable>)}</View>
  </ScrollView>;
}

function SettingsPage({ profile, onChange, onBack, onSchedule, onReset, onSignOut }: { profile: LearnerProfile; onChange: (next: LearnerProfile) => void; onBack: () => void; onSchedule: () => void; onReset: () => void; onSignOut: () => void }) {
  const change = <K extends keyof LearnerProfile>(key: K, value: LearnerProfile[K]) => onChange({ ...profile, [key]: value });
  const firstName = profile.name.trim().split(' ')[0] || 'there';
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.topRow}><IconButton label="Back to dashboard" onPress={onBack}><ArrowLeft color={colors.ink} size={21} /></IconButton><Text style={styles.settingsTopLabel}>SETTINGS</Text><View style={{ width: 42 }} /></View>
      <Heading eyebrow="ACCOUNT" title={`hey, ${firstName}`} sub="manage your learning plan and check-in preferences." />
      <View style={styles.settingsCard}>
        <View style={styles.settingsSectionHead}><View style={styles.settingsSectionIcon}><Text>◌</Text></View><Text style={styles.settingsSectionTitle}>Account</Text></View>
        <Text style={styles.fieldLabel}>YOUR NAME</Text><TextInput value={profile.name} onChangeText={(value) => change('name', value)} placeholder="Your name" placeholderTextColor={colors.muted} style={styles.textInput} />
        <Text style={styles.fieldLabel}>EXPERIENCE LEVEL</Text><View style={styles.chips}>{(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((level) => <Pressable key={level} onPress={() => change('experienceLevel', level)} style={[styles.chip, profile.experienceLevel === level && styles.chipActive]}><Text style={[styles.chipText, profile.experienceLevel === level && styles.chipTextActive]}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text></Pressable>)}</View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open Schedule Manager" onPress={onSchedule} style={styles.scheduleManagerLink}><View style={styles.scheduleManagerIcon}><MaterialCommunityIcons name="calendar-clock-outline" size={21} color={colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.scheduleManagerTitle}>Schedule manager</Text><Text style={styles.scheduleManagerSub}>Busy times, voice routine, and your best daily plan.</Text></View><MaterialCommunityIcons name="chevron-right" size={23} color={colors.muted} /></Pressable>
      <View style={styles.settingsCard}><View style={styles.settingsSectionHead}><View style={styles.settingsSectionIcon}><Text>◌</Text></View><Text style={styles.settingsSectionTitle}>Notifications</Text></View><View style={styles.reminderRow}><View style={styles.reminderCopy}><View style={styles.reminderTitleRow}><Clock3 size={17} color={colors.forest} /><Text style={styles.reminderTitle}>Daily check-in</Text></View><Text style={styles.reminderSub}>A gentle reminder at {profile.freeTime ? formatTime12(profile.freeTime) : 'your chosen time'}.</Text></View><Switch value={profile.reminders} onValueChange={(value) => change('reminders', value)} trackColor={{ false: colors.border, true: colors.moss }} thumbColor="#fff" /></View></View>
      <Pressable onPress={onReset} style={styles.resetJourney}><RotateCcw size={16} color={colors.red} /><Text style={styles.resetJourneyText}>Reset my 90-day journey</Text></Pressable>
      <Pressable onPress={onSignOut} style={styles.signOutButton}><Text style={styles.signOutText}>Sign out</Text></Pressable>
    </ScrollView>
  );
}

function AuthPage({ supabase, configurationError }: { supabase: SupabaseClient | null; configurationError: string | null }) {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async () => {
    if (!supabase) return;
    if (!email.trim() || password.length < 6) { setMessage('Use a valid email and a password with at least 6 characters.'); return; }
    setBusy(true); setMessage('');
    const result = mode === 'signIn'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: 'vokai://auth/callback' },
      });
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (mode === 'signUp' && !result.data.session) setMessage('Check your email to confirm your account, then sign in.');
  };
  const google = async () => {
    if (!supabase) return;
    setBusy(true); setMessage('');
    try { await signInWithGoogle(supabase); } catch (error) { setMessage(error instanceof Error ? error.message : 'Google sign-in could not be completed.'); }
    setBusy(false);
  };
  return (
    <View style={styles.authRoot}>
      <SafeAreaView style={styles.authSafe} edges={['top', 'bottom']}>
        <View style={styles.onboardBrand}><View style={styles.brandMark}><Sprout size={21} color={colors.forest} /></View><Text style={styles.brandText}>VOKAI</Text></View>
        <View style={styles.authBody}>
          <Text style={styles.onboardEmoji}>🌱</Text>
          <Text style={styles.authTitle}>{mode === 'signIn' ? 'Welcome back.' : 'Start your coding garden.'}</Text>
          <Text style={styles.authSub}>{mode === 'signIn' ? 'Sign in to continue your own 90-day journey.' : 'Create an account to save every check-in and streak.'}</Text>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} style={styles.onboardInput} />
          <Text style={styles.fieldLabel}>PASSWORD</Text>
          <TextInput autoCapitalize="none" autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} secureTextEntry value={password} onChangeText={setPassword} placeholder="At least 6 characters" placeholderTextColor={colors.muted} style={styles.onboardInput} />
          {!!message && <Text style={styles.authMessage}>{message}</Text>}
          {!!configurationError && <Text style={styles.authMessage}>{configurationError}</Text>}
          <Pressable disabled={!supabase || busy} onPress={submit} style={[styles.onboardNext, (!supabase || busy) && styles.authDisabled]}><Text style={styles.onboardNextText}>{busy ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}</Text></Pressable>
          <View style={styles.authDivider}><View style={styles.authLine} /><Text style={styles.authDividerText}>OR</Text><View style={styles.authLine} /></View>
          <Pressable disabled={!supabase || busy} onPress={google} style={[styles.googleButton, (!supabase || busy) && styles.authDisabled]}><Text style={styles.googleMark}>G</Text><Text style={styles.googleButtonText}>Continue with Google</Text></Pressable>
          <Pressable disabled={busy} onPress={() => { setMode((value) => value === 'signIn' ? 'signUp' : 'signIn'); setMessage(''); }} style={styles.authModeButton}><Text style={styles.authModeText}>{mode === 'signIn' ? 'New here? Create an account' : 'Already have an account? Sign in'}</Text></Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Onboarding({ onFinish, suggestedName = '' }: { onFinish: (profile: LearnerProfile) => void; suggestedName?: string }) {
  const [draft, setDraft] = useState<OnboardingDraft>({ ...starterProfile, name: suggestedName });
  const [step, setStep] = useState(0);
  const [languageOpen, setLanguageOpen] = useState(false);
  const change = <K extends keyof LearnerProfile>(key: K, value: LearnerProfile[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const updateRoutine = (busySchedule: BusyBlock[], dailyMinutes: number) => {
    const window = suggestedLearningWindow(busySchedule, dailyMinutes);
    setDraft((previous) => ({ ...previous, busySchedule, dailyMinutes, freeTime: window.start }));
  };
  const next = () => {
    if (step === 0 && !draft.name.trim()) { Alert.alert('Tell us your name', 'It helps VOKAI make your plan feel personal.'); return; }
    if (step === 1 && draft.language === 'Other' && !draft.customLanguage?.trim()) { Alert.alert('Name your language', 'Tell VOKAI what you are learning.'); return; }
    if (step === 3) onFinish({ ...draft, name: draft.name.trim(), customLanguage: draft.customLanguage?.trim() || undefined, freeTime: suggestedLearningWindow(draft.busySchedule, draft.dailyMinutes).start });
    else setStep((value) => value + 1);
  };
  return (
    <View style={styles.onboardingRoot}>
      <SafeAreaView style={styles.onboardingSafe} edges={['top', 'bottom']}>
        <View style={styles.onboardBrand}><View style={styles.brandMark}><Sprout size={21} color={colors.forest} /></View><Text style={styles.brandText}>VOKAI</Text></View>
        <View style={styles.stepDots}>{[0, 1, 2, 3].map((index) => <View key={index} style={[styles.stepDot, index <= step && styles.stepDotActive]} />)}</View>
        <View style={styles.onboardBody}>
          {step === 0 && <><Text style={styles.onboardEmoji}>🌱</Text><Text style={styles.onboardTitle}>Let’s grow your coding habit.</Text><Text style={styles.onboardSub}>Ninety days, one clear path, and a garden that shows every bit of progress.</Text><Text style={styles.fieldLabel}>WHAT SHOULD WE CALL YOU?</Text><TextInput autoFocus value={draft.name} onChangeText={(value) => change('name', value)} placeholder="Your first name" placeholderTextColor={colors.muted} style={styles.onboardInput} /></>}
          {step === 1 && <><Text style={styles.onboardEmoji}>⌨️</Text><Text style={styles.onboardTitle}>What are you learning?</Text><Text style={styles.onboardSub}>Choose a path now. You can change it later from Settings.</Text><Pressable onPress={() => setLanguageOpen((value) => !value)} style={styles.languageDropdown}><Text style={styles.languageDropdownText}>{draft.language === 'Other' ? draft.customLanguage?.trim() || 'Other language' : draft.language}</Text><ChevronRight color={colors.forest} size={22} /></Pressable>{languageOpen && <View style={styles.languageDropdownMenu}>{LANGUAGES.map((language) => <Pressable key={language} onPress={() => { change('language', language); setLanguageOpen(false); }} style={[styles.languageDropdownOption, draft.language === language && styles.languageDropdownOptionActive]}><Text style={[styles.languageDropdownOptionText, draft.language === language && styles.languageDropdownOptionTextActive]}>{language}</Text>{draft.language === language && <Check color={colors.forest} size={15} />}</Pressable>)}</View>}{draft.language === 'Other' && <><Text style={styles.fieldLabel}>YOUR LANGUAGE</Text><TextInput autoFocus value={draft.customLanguage ?? ''} onChangeText={(value) => change('customLanguage', value)} placeholder="e.g. Go, Swift, PHP" placeholderTextColor={colors.muted} style={styles.onboardInput} /></>}</>}
          {step === 2 && <><Text style={styles.onboardEmoji}>◌</Text><Text style={styles.onboardTitle}>How much do you know?</Text><Text style={styles.onboardSub}>This helps Gemini set the right pace and depth for your syllabus.</Text><View style={styles.experienceOptions}>{(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((level) => <Pressable key={level} onPress={() => change('experienceLevel', level)} style={[styles.experienceOption, draft.experienceLevel === level && styles.experienceOptionActive]}><View style={styles.experienceOptionCopy}><Text style={[styles.experienceOptionTitle, draft.experienceLevel === level && styles.experienceOptionTitleActive]}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text><Text style={styles.experienceOptionSub}>{level === 'beginner' ? 'Starting from the basics' : level === 'intermediate' ? 'I know the foundations' : 'Ready for deeper topics'}</Text></View>{draft.experienceLevel === level && <Check color={colors.forest} size={17} />}</Pressable>)}</View></>}
          {step === 3 && <><Text style={styles.onboardEmoji}>☀️</Text><Text style={styles.onboardTitle}>Protect your time.</Text><Text style={styles.onboardSub}>Tell us when you are busy. VOKAI will reserve a free learning session around it.</Text><BusyRoutineEditor busySchedule={draft.busySchedule} dailyMinutes={draft.dailyMinutes} onChange={updateRoutine} /><View style={styles.reminderRow}><View><Text style={styles.reminderTitle}>Daily reminder</Text><Text style={styles.reminderSub}>A nudge at {formatTime12(suggestedLearningWindow(draft.busySchedule, draft.dailyMinutes).start)}.</Text></View><Switch value={draft.reminders} onValueChange={(value) => change('reminders', value)} trackColor={{ false: colors.border, true: colors.moss }} thumbColor="#fff" /></View></>}
        </View>
        <Pressable onPress={next} style={styles.onboardNext}><Text style={styles.onboardNextText}>{step === 3 ? 'Build my syllabus' : 'Continue'}</Text><ChevronRight color="#fff" size={20} /></Pressable>
      </SafeAreaView>
    </View>
  );
}

function TabBar({ screen, setScreen }: { screen: Screen; setScreen: (screen: Screen) => void }) {
  const tabs: { key: Screen; label: string; icon: MaterialIconName }[] = [
    { key: 'home', label: 'Today', icon: 'calendar-check-outline' },
    { key: 'syllabus', label: 'Syllabus', icon: 'book-open-page-variant-outline' },
    { key: 'focus', label: 'Focus', icon: 'message-processing-outline' },
    { key: 'friends', label: 'Friends', icon: 'account-group-outline' },
    { key: 'settings', label: 'Settings', icon: 'cog-outline' },
  ];
  return <View style={styles.tabBar}>{tabs.map((tab) => { const active = screen === tab.key; return <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setScreen(tab.key)} style={styles.tab}><View style={[styles.tabIcon, active && styles.tabIconActive]}><MaterialCommunityIcons name={tab.icon} size={21} color={active ? colors.forest : colors.muted} /></View><Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text></Pressable>; })}</View>;
}

export default function VokaiApp() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [progress, setProgress] = useState<Progress>(defaultProgress());
  const [screen, setScreen] = useState<Screen>('home');
  const [activeTask, setActiveTask] = useState<LessonTask | null>(null);
  const [serverDay, setServerDay] = useState<number | null>(null);
  const [serverWeek, setServerWeek] = useState<RemoteCheckIn[]>([]);
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [syllabusLoading, setSyllabusLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [wallet, setWallet] = useState({ coins: 0, points: 0 });
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<FriendProfile | null>(null);
  const userId = session?.user.id ?? '';
  const accessToken = session?.access_token ?? '';
  const day = serverDay ?? courseDay(progress.startedAt);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      const config = await fetchSupabaseAuthConfig();
      if (!config) {
        if (active) { setAuthError('Could not reach the VOKAI server. Check EXPO_PUBLIC_VOKAI_API_URL in your client .env.'); setAuthLoading(false); }
        return;
      }
      const client = createVokaiSupabase(config);
      const listener = client.auth.onAuthStateChange((_event, nextSession) => { if (active) setSession(nextSession); });
      unsubscribe = () => listener.data.subscription.unsubscribe();
      const { data, error } = await client.auth.getSession();
      if (!active) return;
      if (error) setAuthError(error.message);
      setSupabase(client);
      setSession(data.session);
      setAuthLoading(false);
    })();
    return () => { active = false; unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (!userId || !accessToken) return;
    let active = true;
    setLoading(true);
    void (async () => {
      let { profile: savedProfile, progress: savedProgress } = await loadAppData(userId);
      const remoteSnapshot = await fetchVokaiJourney(accessToken);
      if (remoteSnapshot) {
        savedProgress = mergeProgressWithSnapshot(savedProgress, remoteSnapshot);
        const remoteProfile = profileFromSnapshot(remoteSnapshot);
        if (remoteProfile) {
          savedProfile = remoteProfile;
          await saveProfile(userId, remoteProfile);
        }
        await saveProgress(userId, savedProgress);
      }
      if (!active) return;
      setProfile(savedProfile);
      setProgress(savedProgress);
      setUserCode(remoteSnapshot?.profile?.user_code ? String(remoteSnapshot.profile.user_code) : null);
      setWallet({ coins: remoteSnapshot?.profile?.coins ?? 0, points: remoteSnapshot?.profile?.points ?? 0 });
      setServerDay(remoteSnapshot?.journey_day ?? null);
      setServerWeek(remoteSnapshot?.week ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [accessToken, userId]);

  const changeProgress = (next: Progress) => { setProgress(next); if (userId) void saveProgress(userId, next); };
  const applySnapshot = (snapshot: JourneySnapshot) => {
    setServerDay(snapshot.journey_day);
    setServerWeek(snapshot.week);
    if (snapshot.profile?.user_code) setUserCode(String(snapshot.profile.user_code));
    if (snapshot.profile) setWallet({ coins: snapshot.profile.coins ?? 0, points: snapshot.profile.points ?? 0 });
    setProgress((previous) => {
      const next = mergeProgressWithSnapshot(previous, snapshot);
      if (userId) void saveProgress(userId, next);
      return next;
    });
  };
  const applyFriendsSnapshot = (snapshot: FriendsSnapshot) => {
    setFriends(snapshot.friends);
    setFriendRequests(snapshot.incoming_requests);
  };
  useEffect(() => {
    if (!profile || !accessToken) return;
    let active = true;
    void fetchVokaiJourney(accessToken).then((snapshot) => {
      if (active && snapshot) applySnapshot(snapshot);
    });
    return () => { active = false; };
  }, [accessToken, profile, screen]);
  useEffect(() => {
    if (!profile || !accessToken) return;
    void (async () => {
      const snapshot = await syncVokaiProfile(accessToken, profile, progress.startedAt) ?? await fetchVokaiJourney(accessToken);
      if (snapshot) applySnapshot(snapshot);
    })();
  }, [accessToken, profile?.dailyMinutes, profile?.freeTime, profile?.language, profile?.name, profile?.reminders, progress.startedAt]);
  useEffect(() => {
    if (!profile || !accessToken) return;
    let active = true;
    setSyllabusLoading(true);
    void (async () => {
      const saved = await fetchVokaiSyllabus(accessToken);
      const language = learningLanguage(profile);
      if (saved && saved.language === language && saved.experience_level === profile.experienceLevel && hasOneTopicPerDay(saved)) {
        if (active) { setSyllabus(saved); setSyllabusLoading(false); }
        return;
      }
      if (active && saved) setSyllabus(saved);
      const generated = await generateVokaiSyllabus(accessToken);
      if (active) { setSyllabus(generated); setSyllabusLoading(false); }
    })();
    return () => { active = false; };
  }, [accessToken, profile?.customLanguage, profile?.experienceLevel, profile?.language]);
  const refreshFriends = async () => {
    if (!accessToken) return false;
    setFriendsLoading(true);
    const snapshot = await fetchVokaiFriends(accessToken);
    setFriendsLoading(false);
    if (!snapshot) return false;
    applyFriendsSnapshot(snapshot);
    return true;
  };
  useEffect(() => {
    if (!profile || !accessToken) return;
    void refreshFriends();
  }, [accessToken, profile?.name]);
  const toggleTask = (taskId: string) => {
    if (!profile) return;
    const current = progress.tasksByDay[day] ?? [];
    const taskIds = tasksForDay(learningLanguage(profile), day, profile.experienceLevel).map((task) => task.id);
    const nextTasks = current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId];
    const allDone = taskIds.every((id) => nextTasks.includes(id));
    const completedDays = allDone ? Array.from(new Set([...progress.completedDays, day])) : progress.completedDays.filter((completedDay) => completedDay !== day);
    changeProgress({ ...progress, tasksByDay: { ...progress.tasksByDay, [day]: nextTasks }, completedDays });
    if (accessToken && (taskId === 'learn' || taskId === 'build' || taskId === 'reflect')) {
      void syncVokaiCheckIn(accessToken, taskId, nextTasks.includes(taskId)).then((snapshot) => {
        if (snapshot) applySnapshot(snapshot);
      });
    }
  };
  const syncProfile = (nextProfile: LearnerProfile) => {
    if (!accessToken) return;
    void syncVokaiProfile(accessToken, nextProfile, progress.startedAt).then((snapshot) => {
      if (snapshot) applySnapshot(snapshot);
    });
  };
  const toggleSyllabusTopic = (topicId: string, completed: boolean) => {
    setSyllabus((previous) => previous ? { ...previous, topics: previous.topics.map((topic) => topic.id === topicId ? { ...topic, completed } : topic) } : previous);
    if (accessToken) void syncVokaiSyllabusTopic(accessToken, topicId, completed).then((next) => { if (next) setSyllabus(next); });
  };
  const sendFriendRequest = async (email: string) => {
    if (!accessToken) return false;
    const snapshot = await sendVokaiFriendRequest(accessToken, email);
    if (!snapshot) return false;
    applyFriendsSnapshot(snapshot);
    return true;
  };
  const respondToFriendRequest = async (requesterId: string, action: 'accept' | 'decline') => {
    if (!accessToken) return false;
    const snapshot = await respondToVokaiFriendRequest(accessToken, requesterId, action);
    if (!snapshot) return false;
    applyFriendsSnapshot(snapshot);
    return true;
  };
  const removeFriend = async (friendId: string) => {
    if (!accessToken) return false;
    const snapshot = await removeVokaiFriend(accessToken, friendId);
    if (!snapshot) return false;
    applyFriendsSnapshot(snapshot);
    return true;
  };
  const openFriendProfile = async (friend: Friend) => {
    if (!accessToken) return;
    const remoteProfile = await fetchVokaiFriendProfile(accessToken, friend.id);
    if (!remoteProfile) {
      Alert.alert('Profile unavailable', 'This friend profile could not be opened. Refresh your friends and try again.');
      return;
    }
    setSelectedFriendProfile(remoteProfile);
    setScreen('friendProfile');
  };
  const uploadProfilePhoto = async (uri: string, mimeType?: string | null) => {
    if (!accessToken || !profile) return false;
    const remoteProfile = await uploadVokaiProfilePhoto(accessToken, uri, mimeType);
    if (!remoteProfile?.profile_image_url) return false;
    const nextProfile = { ...profile, profileImageUrl: remoteProfile.profile_image_url };
    setProfile(nextProfile);
    if (userId) await saveProfile(userId, nextProfile);
    return true;
  };
  const finishOnboarding = async (nextProfile: LearnerProfile) => { setProfile(nextProfile); if (userId) await saveProfile(userId, nextProfile); syncProfile(nextProfile); if (nextProfile.reminders) { const granted = await setDailyReminder(true, nextProfile.freeTime); if (!granted) { const withoutReminder = { ...nextProfile, reminders: false }; setProfile(withoutReminder); if (userId) await saveProfile(userId, withoutReminder); syncProfile(withoutReminder); Alert.alert('Reminder not enabled', 'You can turn it on later from Settings after allowing notifications.'); } } };
  const updateProfile = async (next: LearnerProfile) => { setProfile(next); if (userId) await saveProfile(userId, next); syncProfile(next); const enabled = await setDailyReminder(next.reminders, next.freeTime); if (next.reminders && !enabled) Alert.alert('Notifications need permission', 'Allow notifications in Android Settings to receive your daily learning reminder.'); };
  const resetJourney = () => Alert.alert('Reset journey?', 'This clears your routine and check-ins, deletes your saved syllabus, and starts a fresh garden for this account.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: async () => { await setDailyReminder(false, '19:00'); if (accessToken) await resetVokaiJourney(accessToken); if (userId) await resetAppData(userId); setProfile(null); setProgress(defaultProgress()); setServerDay(null); setServerWeek([]); setSyllabus(null); setFriends([]); setFriendRequests([]); setUserCode(null); setWallet({ coins: 0, points: 0 }); setSelectedFriendProfile(null); setScreen('home'); } }]);
  const signOut = async () => { await setDailyReminder(false, profile?.freeTime ?? '19:00'); await supabase?.auth.signOut(); setProfile(null); setProgress(defaultProgress()); setServerDay(null); setServerWeek([]); setSyllabus(null); setFriends([]); setFriendRequests([]); setUserCode(null); setWallet({ coins: 0, points: 0 }); setSelectedFriendProfile(null); setScreen('home'); };
  if (authLoading) return <SafeAreaView style={styles.loading}><Text style={styles.brandText}>VOKAI</Text><Text style={styles.loadingText}>Opening your garden…</Text></SafeAreaView>;
  if (!session) return <AuthPage supabase={supabase} configurationError={authError} />;
  if (loading) return <SafeAreaView style={styles.loading}><Text style={styles.brandText}>VOKAI</Text><Text style={styles.loadingText}>Preparing your garden…</Text></SafeAreaView>;
  if (!profile) return <Onboarding onFinish={finishOnboarding} suggestedName={authFirstName(session.user)} />;
  const tasks = tasksForDay(learningLanguage(profile), day, profile.experienceLevel);
  const selectedTask = activeTask ?? tasks.find((task) => !(progress.tasksByDay[day] ?? []).includes(task.id)) ?? tasks[0];
  const content = screen === 'home' ? <HomePage profile={profile} progress={progress} day={day} week={serverWeek} onToggleTask={toggleTask} onGarden={() => setScreen('garden')} onFocus={(task) => { setActiveTask(task); setScreen('focus'); }} onProfile={() => setScreen('profile')} onSettings={() => setScreen('settings')} /> : screen === 'garden' ? <GardenPage profile={profile} progress={progress} day={day} week={serverWeek} onBack={() => setScreen('home')} /> : screen === 'syllabus' ? <SyllabusPage profile={profile} day={day} syllabus={syllabus} loading={syllabusLoading} onBack={() => setScreen('home')} onToggle={toggleSyllabusTopic} /> : screen === 'focus' ? <FocusPage task={selectedTask} profile={profile} day={day} completedCount={(progress.tasksByDay[day] ?? []).length} completed={(progress.tasksByDay[day] ?? []).includes(selectedTask.id)} accessToken={accessToken} onBack={() => setScreen('home')} onComplete={() => { if (!(progress.tasksByDay[day] ?? []).includes(selectedTask.id)) toggleTask(selectedTask.id); }} /> : screen === 'friends' ? <FriendsPage friends={friends} requests={friendRequests} loading={friendsLoading} onRefresh={refreshFriends} onSendRequest={sendFriendRequest} onRespond={respondToFriendRequest} onRemove={removeFriend} onVisit={(friend) => void openFriendProfile(friend)} onLeaderboard={() => setScreen('leaderboard')} /> : screen === 'leaderboard' ? <LeaderboardPage profile={profile} points={wallet.points} friends={friends} onBack={() => setScreen('friends')} onOpenFriend={(friend) => void openFriendProfile(friend)} onOpenSelf={() => setScreen('profile')} /> : screen === 'profile' ? <ProfilePage profile={profile} email={session.user.email ?? ''} userCode={userCode} progress={progress} day={day} week={serverWeek} friends={friends} coins={wallet.coins} points={wallet.points} onBack={() => setScreen('home')} onFriends={() => setScreen('friends')} onUploadPhoto={uploadProfilePhoto} /> : screen === 'friendProfile' && selectedFriendProfile ? <FriendProfilePage friend={selectedFriendProfile} onBack={() => setScreen('friends')} /> : screen === 'schedule' ? <ScheduleManagerPage profile={profile} onChange={updateProfile} onBack={() => setScreen('settings')} /> : <SettingsPage profile={profile} onChange={updateProfile} onBack={() => setScreen('home')} onSchedule={() => setScreen('schedule')} onReset={resetJourney} onSignOut={signOut} />;
  const isFullScreen = screen === 'focus' || screen === 'leaderboard' || screen === 'profile' || screen === 'friendProfile';
  return <SafeAreaView style={styles.root} edges={isFullScreen ? ['top', 'bottom'] : ['top']}><View style={styles.appContent}>{content}</View>{!isFullScreen && <TabBar screen={screen} setScreen={(nextScreen) => { if (nextScreen === 'focus') setActiveTask(null); setScreen(nextScreen); }} />}</SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas }, appContent: { flex: 1 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, gap: 8 }, loadingText: { color: colors.muted, fontSize: 14 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34 }, topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 46 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 8 }, brandMark: { alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 12, backgroundColor: colors.mint }, brandText: { color: colors.ink, fontSize: 18, letterSpacing: 2, fontWeight: '900' }, iconButton: { height: 42, width: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: 0.76, transform: [{ scale: 0.98 }] },
  heading: { marginTop: 25, marginBottom: 22 }, eyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 3, fontWeight: '700', marginBottom: 3 }, headingTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 34, lineHeight: 39, letterSpacing: -0.5 }, headingSub: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5, maxWidth: 330 },
  friendsTopIdentity: { flexDirection: 'row', alignItems: 'center', gap: 8 }, friendsTopIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, friendsRefreshButton: { width: 39, height: 39, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }, friendsRefreshButtonDisabled: { opacity: 0.55 },
  addFriendCard: { padding: 14, borderRadius: 20, backgroundColor: '#F1F8EE', borderWidth: 1, borderColor: '#C9DEC4', marginBottom: 23 }, addFriendHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, addFriendIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }, addFriendTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' }, addFriendSub: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 }, addFriendForm: { height: 47, marginTop: 13, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: '#C9DEC4', flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 4 }, addFriendInput: { flex: 1, height: '100%', color: colors.ink, fontSize: 13, paddingRight: 8 }, addFriendButton: { width: 39, height: 39, borderRadius: 11, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, addFriendButtonDisabled: { opacity: 0.55 },
  friendsSectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }, friendsSectionTitle: { color: colors.ink, fontSize: 19, letterSpacing: -0.3, fontWeight: '900' }, requestCount: { minWidth: 21, height: 21, paddingHorizontal: 6, borderRadius: 11, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, requestCountText: { color: '#fff', fontSize: 10, fontWeight: '900' }, friendTotal: { color: colors.muted, fontSize: 11, fontWeight: '700' }, friendListCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 19, backgroundColor: colors.paper, overflow: 'hidden', marginBottom: 23 }, friendRow: { minHeight: 79, paddingHorizontal: 13, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, friendVisit: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }, requestRow: { minHeight: 72, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, friendRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border }, friendAvatar: { width: 43, height: 43, borderRadius: 15, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, friendAvatarText: { color: colors.forest, fontSize: 16, fontWeight: '900' }, friendCopy: { flex: 1, minWidth: 0 }, friendName: { color: colors.ink, fontSize: 13, fontWeight: '900' }, friendMeta: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 }, friendStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 }, friendStatPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, backgroundColor: '#F3F7F1' }, friendStatText: { color: colors.forest, fontSize: 8, fontWeight: '900' }, requestActions: { flexDirection: 'row', gap: 6 }, acceptFriendButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, declineFriendButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center' }, friendActionDisabled: { opacity: 0.5 }, removeFriendButton: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas },
  friendsEmpty: { minHeight: 178, paddingHorizontal: 25, borderRadius: 20, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, friendsEmptyIcon: { width: 49, height: 49, borderRadius: 17, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }, friendsEmptyTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18, textAlign: 'center', marginTop: 8 }, friendsEmptySub: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 5, maxWidth: 265 },
  homeGarden: { overflow: 'hidden', borderRadius: 28, ...shadow }, homeGardenOverlay: { minHeight: 65, backgroundColor: colors.paper, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, gardenOverlayTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, gardenOverlaySub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  todayHeader: { marginTop: 27, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, sectionTitle: { color: colors.ink, fontSize: 20, letterSpacing: -0.4, fontWeight: '800' }, taskProgress: { color: colors.forest, fontSize: 13, fontWeight: '800' }, progressTrack: { width: '100%', height: 7, borderRadius: 7, backgroundColor: colors.border, overflow: 'hidden' }, progressFill: { height: '100%', borderRadius: 7 }, taskList: { gap: 10, marginTop: 15 }, taskCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper }, taskCardComplete: { backgroundColor: '#F3F8F1', borderColor: '#C8DEC9' }, taskIcon: { width: 41, height: 41, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, taskCopy: { flex: 1, paddingRight: 6 }, taskTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 19 }, doneText: { color: colors.muted, textDecorationLine: 'line-through' }, taskDetail: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 }, durationRow: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 7 }, durationText: { color: colors.muted, fontSize: 11, fontWeight: '600' }, taskActions: { alignItems: 'center', gap: 8 }, playButton: { width: 29, height: 29, borderRadius: 10, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, checkButton: { width: 27, height: 27, borderRadius: 9, borderWidth: 2, borderColor: '#ABC4AF', alignItems: 'center', justifyContent: 'center' }, checkButtonDone: { borderColor: colors.forest, backgroundColor: colors.forest },
  noteCard: { flexDirection: 'row', gap: 12, borderRadius: 21, padding: 16, marginTop: 22 }, noteIcon: { height: 35, width: 35, borderRadius: 12, backgroundColor: '#FFFFFF9E', alignItems: 'center', justifyContent: 'center' }, noteTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 4 }, noteBody: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  streakPill: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#FFF1CC', borderRadius: 15 }, streakText: { color: '#87511F', fontSize: 12, fontWeight: '800' }, gardenFrame: { overflow: 'hidden', borderRadius: 29, backgroundColor: colors.paper, ...shadow }, gardenCaption: { backgroundColor: colors.paper, flexDirection: 'row', gap: 8, alignItems: 'center', padding: 16 }, gardenCaptionText: { flex: 1, color: colors.forest, fontSize: 13, fontWeight: '600' }, weekCard: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, borderRadius: 20, padding: 15, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 17 }, dayColumn: { width: 37, alignItems: 'center', gap: 6 }, dayDot: { height: 30, width: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF3EC' }, dayDotDone: { backgroundColor: colors.forest }, dayDotToday: { borderWidth: 2, borderColor: colors.sun }, dayDotText: { color: colors.muted, fontSize: 10, fontWeight: '800' }, dayLabel: { color: colors.muted, fontSize: 9, fontWeight: '700' }, dayLabelToday: { color: colors.ink }, statGrid: { flexDirection: 'row', gap: 9, marginBottom: 28 }, statCard: { flex: 1, alignItems: 'center', paddingVertical: 15, backgroundColor: colors.paper, borderRadius: 18, borderWidth: 1, borderColor: colors.border }, statNumber: { color: colors.ink, fontSize: 22, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 10, marginTop: 3, fontWeight: '600' }, milestoneCard: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, borderRadius: 21, paddingHorizontal: 15, marginTop: 12 }, milestoneRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11 }, milestoneBorder: { borderBottomWidth: 1, borderBottomColor: colors.border }, milestoneIcon: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F1ED' }, milestoneIconUnlocked: { backgroundColor: colors.mint }, milestoneText: { flex: 1 }, milestoneTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, milestoneSub: { color: colors.muted, fontSize: 11, marginTop: 2 }, lockedText: { color: colors.muted }, milestoneDay: { color: colors.muted, fontSize: 10, fontWeight: '800' }, milestoneDayUnlocked: { color: colors.forest },
  focusPage: { flex: 1, backgroundColor: colors.canvas }, focusHeader: { minHeight: 66, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.paper, borderBottomWidth: 1, borderBottomColor: colors.border }, focusHeaderIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }, focusCoachAvatar: { height: 38, width: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint, borderWidth: 1, borderColor: colors.moss + '55' }, focusCoachIntroCopy: { flex: 1 }, focusChatTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' }, focusChatSub: { color: colors.muted, fontSize: 10, marginTop: 1 }, focusCompleteButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CFE1CB', backgroundColor: '#F5FAF3' }, focusCompleteButtonDone: { backgroundColor: colors.forest, borderColor: colors.forest }, focusTaskContext: { minHeight: 40, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F5FAF3', borderBottomWidth: 1, borderBottomColor: '#DDE8D8' }, focusTaskContextText: { flex: 1, color: colors.forest, fontSize: 11, fontWeight: '700' }, focusTaskMinutes: { color: colors.forest, fontSize: 10, letterSpacing: 0.5, fontWeight: '900', textTransform: 'uppercase' }, focusMessageScroll: { flex: 1 }, focusMessageList: { flexGrow: 1, gap: 12, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 }, focusMessage: { maxWidth: '92%', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 18 }, focusMessageCoach: { alignSelf: 'flex-start', backgroundColor: colors.paper, borderBottomLeftRadius: 5 }, focusMessageUser: { alignSelf: 'flex-end', backgroundColor: colors.forest, borderBottomRightRadius: 5 }, focusMessageText: { color: colors.ink, fontSize: 14, lineHeight: 21 }, focusMessageTextUser: { color: '#fff' }, focusTyping: { minHeight: 45, justifyContent: 'center' }, focusBottom: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 7, backgroundColor: colors.canvas, borderTopWidth: 1, borderTopColor: colors.border }, focusPromptWrap: { flexDirection: 'row', gap: 8, paddingHorizontal: 6, paddingBottom: 10 }, focusPrompt: { minHeight: 34, borderRadius: 17, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#CFE1CB', backgroundColor: '#F5FAF3' }, focusPromptDisabled: { opacity: 0.55 }, focusPromptText: { color: colors.forest, fontSize: 11, fontWeight: '800' }, focusComposer: { minHeight: 54, paddingLeft: 14, paddingRight: 6, borderRadius: 18, flexDirection: 'row', alignItems: 'flex-end', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper }, focusComposerInput: { flex: 1, minHeight: 52, maxHeight: 108, color: colors.ink, fontSize: 14, lineHeight: 20, paddingVertical: 15, paddingRight: 7, textAlignVertical: 'center' }, focusVoiceButton: { width: 42, height: 42, marginBottom: 5, marginRight: 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5FAF3', borderWidth: 1, borderColor: '#CFE1CB' }, focusVoiceButtonListening: { backgroundColor: colors.red, borderColor: colors.red }, focusVoiceButtonDisabled: { opacity: 0.42 }, focusSendButton: { width: 42, height: 42, marginBottom: 5, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest }, focusSendButtonDisabled: { opacity: 0.42 }, focusVoiceStatus: { fontSize: 10, lineHeight: 14, marginTop: 6, textAlign: 'center' }, focusVoiceStatusListening: { color: colors.forest }, focusVoiceStatusError: { color: colors.red }, focusDisclaimer: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 7 },
  coachReply: { gap: 8 }, coachStrongText: { color: colors.forest, fontWeight: '900' }, coachCodeBlock: { overflow: 'hidden', borderRadius: 10, backgroundColor: '#29342D', marginTop: 1 }, coachCodeHeader: { minHeight: 27, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#3B4A40' }, coachCodeLanguage: { color: '#DDEBD9', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }, coachCodeScroll: { minWidth: '100%', paddingHorizontal: 10, paddingVertical: 9 }, coachCodeText: { color: '#F5FAF3', fontFamily: 'monospace', fontSize: 10, lineHeight: 15 },
  settingsTopLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.5, fontWeight: '900' }, settingsCard: { padding: 17, marginBottom: 12, backgroundColor: colors.paper, borderRadius: 21, borderWidth: 1, borderColor: colors.border }, fieldLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1.15, fontWeight: '900', marginTop: 4, marginBottom: 8 }, textInput: { height: 46, borderRadius: 14, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, color: colors.ink, fontSize: 14, marginBottom: 20 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 17 }, chip: { minHeight: 35, paddingHorizontal: 11, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 11 }, durationChip: { height: 37, paddingHorizontal: 13, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12 }, chipActive: { backgroundColor: colors.forest, borderColor: colors.forest }, chipText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, chipTextActive: { color: '#fff' }, timeRow: { marginTop: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, timeHint: { color: colors.muted, fontSize: 11 }, timeInput: { backgroundColor: colors.canvas, borderRadius: 12, width: 72, height: 41, color: colors.ink, textAlign: 'center', fontSize: 14, fontWeight: '800' }, reminderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, reminderCopy: { flex: 1, paddingRight: 12 }, reminderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, reminderTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' }, reminderSub: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }, scheduleManagerLink: { padding: 16, marginBottom: 12, backgroundColor: '#F4FAF2', borderRadius: 21, borderWidth: 1, borderColor: '#CDE1C8', flexDirection: 'row', alignItems: 'center', gap: 11 }, scheduleManagerIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint }, scheduleManagerTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' }, scheduleManagerSub: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 }, scheduleHero: { padding: 15, borderRadius: 20, backgroundColor: colors.mint, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 }, scheduleHeroIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }, scheduleHeroTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17 }, scheduleHeroSub: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 3 }, scheduleModeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 }, scheduleMode: { flex: 1, minHeight: 43, borderRadius: 14, borderWidth: 1, borderColor: colors.moss, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, scheduleModeActive: { backgroundColor: colors.forest, borderColor: colors.forest }, scheduleModeText: { color: colors.forest, fontSize: 11, fontWeight: '900' }, scheduleModeTextActive: { color: '#fff' }, routineNoteCard: { padding: 14, borderRadius: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }, routineNoteHead: { flexDirection: 'row', alignItems: 'center', gap: 9 }, routineNoteIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint }, routineNoteTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' }, routineNoteSub: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 }, routineNoteInput: { minHeight: 112, borderRadius: 13, padding: 11, color: colors.ink, fontSize: 12, lineHeight: 17, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border, marginTop: 12 }, dictationHelp: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10 }, dictationHelpText: { color: colors.forest, fontSize: 10, fontWeight: '800' }, saveRoutineButton: { minHeight: 40, borderRadius: 12, backgroundColor: colors.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, saveRoutineButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' }, scheduleCard: { padding: 16, borderRadius: 21, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }, schedulePlanHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }, schedulePlanEyebrow: { color: colors.forest, fontSize: 9, letterSpacing: 1.1, fontWeight: '900' }, schedulePlanTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, marginTop: 2 }, schedulePlanBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: colors.mint }, schedulePlanBadgeText: { color: colors.forest, fontSize: 8, letterSpacing: 0.7, fontWeight: '900' }, schedulePlanCard: { paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border }, schedulePlanItem: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9 }, schedulePlanDivider: { borderBottomWidth: 1, borderBottomColor: colors.border }, schedulePlanTime: { color: colors.forest, width: 57, fontSize: 9, fontWeight: '900' }, schedulePlanIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint }, schedulePlanItemTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' }, schedulePlanItemSub: { color: colors.muted, fontSize: 9, lineHeight: 13, marginTop: 2 }, resetJourney: { marginTop: 7, height: 48, borderRadius: 15, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, resetJourneyText: { color: colors.red, fontSize: 13, fontWeight: '800' }, signOutButton: { marginTop: 10, height: 46, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }, signOutText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  authRoot: { flex: 1, backgroundColor: colors.canvas }, authSafe: { flex: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 16 }, authBody: { flex: 1, paddingTop: 47 }, authTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 31, lineHeight: 37, letterSpacing: -0.5 }, authSub: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 25 }, authMessage: { color: colors.red, fontSize: 12, lineHeight: 17, marginTop: 2, marginBottom: 10 }, authDisabled: { opacity: 0.55 }, authDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 }, authLine: { height: 1, backgroundColor: colors.border, flex: 1 }, authDividerText: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 }, googleButton: { height: 54, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }, googleMark: { color: '#4285F4', fontWeight: '900', fontSize: 17 }, googleButtonText: { color: colors.ink, fontSize: 14, fontWeight: '800' }, authModeButton: { alignSelf: 'center', paddingVertical: 18 }, authModeText: { color: colors.forest, fontSize: 12, fontWeight: '800' },
  onboardingRoot: { flex: 1, backgroundColor: colors.canvas }, onboardingSafe: { flex: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 16 }, onboardBrand: { flexDirection: 'row', gap: 8, alignItems: 'center' }, stepDots: { flexDirection: 'row', gap: 6, marginTop: 25 }, stepDot: { height: 5, flex: 1, backgroundColor: colors.border, borderRadius: 3 }, stepDotActive: { backgroundColor: colors.forest }, onboardBody: { flex: 1, paddingTop: 47 }, onboardEmoji: { fontSize: 48, marginBottom: 18 }, onboardTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 31, lineHeight: 37, letterSpacing: -0.5 }, onboardSub: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 32 }, onboardInput: { height: 55, borderRadius: 17, paddingHorizontal: 16, color: colors.ink, fontSize: 16, fontWeight: '700', backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border }, onboardLanguageGrid: { gap: 10 }, languageChoice: { minHeight: 50, borderRadius: 16, paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, languageChoiceActive: { borderColor: colors.forest, backgroundColor: colors.mint }, languageChoiceText: { color: colors.ink, fontSize: 14, fontWeight: '800' }, languageChoiceTextActive: { color: colors.forest }, languageChoiceIcon: { fontSize: 18 }, onboardNext: { height: 56, borderRadius: 18, backgroundColor: colors.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, onboardNextText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  checkinContent: { paddingBottom: 32 },
  checkinTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, backgroundColor: colors.canvas },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sun, borderWidth: 2, borderColor: colors.amberRich + '55' },
  profileAvatarText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18 },
  profileGreeting: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20 },
  profileHint: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: -1 },
  userAvatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sun }, userAvatarFallbackText: { color: colors.ink, fontFamily: fonts.serif },
  profileHero: { marginTop: 19, marginBottom: 16, padding: 18, borderRadius: 23, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 }, profilePhotoButton: { position: 'relative' }, profilePhotoEdit: { position: 'absolute', right: -3, bottom: -3, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.forest, borderWidth: 2, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' }, profileHeroName: { color: colors.ink, fontFamily: fonts.serif, fontSize: 25, lineHeight: 30 }, profileHeroLanguage: { color: colors.muted, fontSize: 11, textTransform: 'capitalize', marginTop: 3 },
  profileIdCard: { minHeight: 102, padding: 16, marginBottom: 24, borderRadius: 20, backgroundColor: colors.mint, borderWidth: 1, borderColor: '#C9DEC4', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, profileIdLabel: { color: colors.forest, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, profileIdValue: { color: colors.ink, fontFamily: fonts.serif, fontSize: 25, letterSpacing: 1.1, marginTop: 3 }, profileIdSub: { color: colors.muted, fontSize: 9, marginTop: 3 }, profileIdIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  profileEmailCard: { minHeight: 65, marginTop: -12, marginBottom: 9, paddingHorizontal: 13, borderRadius: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }, profileEmailIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, profileEmailLabel: { color: colors.muted, fontSize: 8, letterSpacing: 0.9, fontWeight: '900' }, profileEmailValue: { color: colors.ink, fontSize: 11, fontWeight: '700', marginTop: 3 },
  friendProfileHero: { minHeight: 93, alignItems: 'center', flexDirection: 'row', gap: 13, marginTop: 23, marginBottom: 18 }, rewardBalanceCard: { minHeight: 82, paddingHorizontal: 15, borderRadius: 20, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, rewardBalanceItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, rewardBalanceIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, rewardBalanceDivider: { width: 1, height: 40, backgroundColor: colors.border, marginHorizontal: 8 }, rewardBalanceLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1, fontWeight: '900' }, rewardBalanceValue: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 1 }, rewardHint: { paddingHorizontal: 12, paddingVertical: 10, marginTop: 9, borderRadius: 15, backgroundColor: '#F5FAF3', flexDirection: 'row', gap: 8, alignItems: 'flex-start' }, rewardHintText: { flex: 1, color: colors.forest, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  profileSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 23, marginBottom: 10 }, profileSectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.3 }, profileSectionMeta: { color: colors.muted, fontSize: 10, fontWeight: '700' }, profileSectionLink: { color: colors.forest, fontSize: 11, fontWeight: '900' }, profileStatsGrid: { flexDirection: 'row', gap: 9 }, profileLanguageCard: { minHeight: 68, marginTop: 10, borderRadius: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, profileLanguageIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }, profileLanguageTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' }, profileLanguageSub: { color: colors.muted, fontSize: 10, marginTop: 2 },
  profileCheckinCard: { minHeight: 72, paddingHorizontal: 14, borderRadius: 19, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, profileCheckinDay: { width: 37, alignItems: 'center', gap: 6 }, profileCheckinDot: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, profileCheckinDotDone: { backgroundColor: colors.forest, borderColor: colors.forest }, profileCheckinDotToday: { borderColor: colors.amberRich, borderWidth: 2 }, profileCheckinLabel: { color: colors.muted, fontSize: 8, fontWeight: '700' }, profileCheckinLabelToday: { color: colors.ink, fontWeight: '900' },
  profileFriendsEmpty: { minHeight: 57, paddingHorizontal: 13, borderRadius: 17, backgroundColor: '#F5FAF3', borderWidth: 1, borderColor: '#CDE1C8', flexDirection: 'row', alignItems: 'center', gap: 9 }, profileFriendsEmptyText: { flex: 1, color: colors.forest, fontSize: 11, fontWeight: '700' }, profileFriendsCard: { minHeight: 61, paddingHorizontal: 13, borderRadius: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }, profileFriendAvatar: { width: 31, height: 31, marginRight: -6, borderRadius: 11, backgroundColor: colors.mint, borderWidth: 2, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' }, profileFriendAvatarText: { color: colors.forest, fontSize: 11, fontWeight: '900' }, profileFriendMore: { width: 31, height: 31, marginRight: 7, borderRadius: 11, backgroundColor: colors.canvas, borderWidth: 2, borderColor: colors.paper, alignItems: 'center', justifyContent: 'center' }, profileFriendMoreText: { color: colors.muted, fontSize: 9, fontWeight: '900' }, profileFriendsText: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '800', marginLeft: 12 },
  profileAchievementsCard: { borderRadius: 20, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 8 }, profileAchievement: { minHeight: 43, paddingHorizontal: 7, borderRadius: 13, backgroundColor: '#F5FAF3', flexDirection: 'row', alignItems: 'center', gap: 9 }, profileAchievementLocked: { backgroundColor: colors.canvas, opacity: 0.7 }, profileAchievementIcon: { width: 29, height: 29, borderRadius: 10, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }, profileAchievementIconDone: { backgroundColor: colors.mint }, profileAchievementTitle: { flex: 1, color: colors.ink, fontSize: 11, fontWeight: '800' }, profileAchievementTitleLocked: { color: colors.muted }, profileAchievementDay: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  checkinProgressPill: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  checkinProgressPillDone: { backgroundColor: colors.mint, borderColor: colors.moss },
  checkinProgressText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  checkinProgressTextDone: { color: colors.forest },
  clarioGardenCard: { overflow: 'hidden', marginBottom: 24, backgroundColor: colors.paper, borderBottomWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  gardenTrackerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.paper },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.sun, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  streakNum: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  streakLabel: { color: colors.ink, fontSize: 11 },
  weekDots: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  trackerDotCol: { alignItems: 'center', gap: 3 },
  trackerDot: { width: 10, height: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.border },
  trackerDotDone: { backgroundColor: colors.forest },
  trackerDotToday: { borderWidth: 2, borderColor: colors.amberRich, backgroundColor: '#FFF5DA' },
  trackerDotTodayDone: { backgroundColor: colors.forest, borderColor: colors.forest },
  trackerDotLabel: { color: colors.muted, fontSize: 8, fontWeight: '600' },
  trackerDotLabelToday: { color: colors.ink, fontWeight: '800' },
  gardenLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  nextMilestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#FFFDF8' },
  nextMilestoneIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF4E9', borderWidth: 1, borderColor: colors.moss + '55' },
  milestoneTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  milestoneEyebrow: { color: colors.forest, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  milestoneDays: { color: colors.muted, fontSize: 9 },
  nextMilestoneTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 14, marginBottom: 5 },
  checkinMain: { paddingHorizontal: 20 },
  checkinHeader: { marginBottom: 24 },
  clarioTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 34, letterSpacing: -0.5 },
  clarioSubtitle: { marginTop: 4, color: colors.muted, fontSize: 13 },
  checkinCard: { borderRadius: 22, padding: 3, marginBottom: 2 },
  checkinCardInner: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 19, padding: 18, backgroundColor: colors.paper },
  checkinIcon: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkinCopy: { flex: 1 },
  checkinMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 2 },
  checkinNumber: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  checkinSubtitle: { color: colors.muted, fontSize: 9, letterSpacing: 0.7, fontWeight: '700', flexShrink: 1 },
  checkinTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 22 },
  checkinDetail: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  allDoneBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, marginTop: 16, backgroundColor: colors.mint },
  allDoneIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest },
  allDoneTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 16 },
  allDoneSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  settingsSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 },
  settingsSectionIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border },
  settingsSectionTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17 },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#FCFEFA', paddingTop: 9, paddingBottom: 10 }, tab: { minWidth: 57, alignItems: 'center', gap: 3 }, tabIcon: { height: 31, width: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 11 }, tabIconActive: { backgroundColor: colors.mint }, tabLabel: { color: colors.muted, fontSize: 10, fontWeight: '600' }, tabLabelActive: { color: colors.forest, fontWeight: '900' },
  languageDropdown: { minHeight: 56, borderWidth: 1, borderColor: colors.moss, borderRadius: 17, paddingHorizontal: 16, backgroundColor: colors.paper, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, languageDropdownText: { color: colors.ink, fontSize: 15, fontWeight: '800' }, languageDropdownMenu: { marginTop: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, borderRadius: 17, overflow: 'hidden' }, languageDropdownOption: { minHeight: 45, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border }, languageDropdownOptionActive: { backgroundColor: colors.mint }, languageDropdownOptionText: { color: colors.ink, fontSize: 13, fontWeight: '700' }, languageDropdownOptionTextActive: { color: colors.forest },
  routineEditor: { gap: 10 }, routineHint: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: -4, marginBottom: 3 }, busyBlock: { padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: colors.canvas }, busyBlockTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, busyTitleInput: { flex: 1, height: 38, color: colors.ink, fontSize: 13, fontWeight: '700' }, removeBusyButton: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFEAE8', alignItems: 'center', justifyContent: 'center' }, removeBusyText: { color: colors.red, fontSize: 20, lineHeight: 22 }, busyTimeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginTop: 7 }, busyTimeField: { flex: 1, minWidth: 0 }, busyTimeLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4, marginLeft: 2 }, busyTimeControl: { height: 39, borderRadius: 10, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }, busyTimeInput: { flex: 1, height: '100%', minWidth: 0, color: colors.ink, textAlign: 'center', fontSize: 12, fontWeight: '800', paddingHorizontal: 4 }, busyMeridiem: { flexDirection: 'row', alignSelf: 'stretch', borderLeftWidth: 1, borderLeftColor: colors.border }, busyMeridiemOption: { minWidth: 25, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }, busyMeridiemOptionActive: { backgroundColor: colors.forest }, busyMeridiemText: { color: colors.muted, fontSize: 8, fontWeight: '900' }, busyMeridiemTextActive: { color: '#fff' }, busyTo: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 10 }, addBusyButton: { minHeight: 42, borderRadius: 13, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.moss, alignItems: 'center', justifyContent: 'center' }, addBusyText: { color: colors.forest, fontSize: 12, fontWeight: '800' }, suggestedWindow: { marginTop: 2, minHeight: 65, borderRadius: 16, paddingHorizontal: 14, backgroundColor: colors.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, suggestedEyebrow: { color: colors.forest, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, suggestedTime: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18, marginTop: 3 },
  experienceOptions: { gap: 10 }, experienceOption: { minHeight: 67, paddingHorizontal: 15, paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, experienceOptionActive: { borderColor: colors.moss, backgroundColor: colors.mint }, experienceOptionCopy: { flex: 1 }, experienceOptionTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' }, experienceOptionTitleActive: { color: colors.forest }, experienceOptionSub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  syllabusHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, marginBottom: 18 }, syllabusHeadingIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint }, syllabusTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 25, lineHeight: 29 }, syllabusSub: { color: colors.muted, fontSize: 11, marginTop: 3 }, syllabusLoading: { minHeight: 230, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 22 }, syllabusLoadingTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18, marginTop: 9 }, syllabusLoadingSub: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 4, maxWidth: 240 }, syllabusEmpty: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper, alignItems: 'center', padding: 24, marginTop: 8 }, syllabusEmptyTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18, marginTop: 9 }, syllabusEmptySub: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 }, syllabusGenerate: { height: 46, paddingHorizontal: 17, borderRadius: 14, backgroundColor: colors.forest, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 17 }, syllabusGenerateText: { color: '#fff', fontSize: 13, fontWeight: '800' }, syllabusProgressCard: { borderRadius: 18, padding: 16, backgroundColor: colors.mint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, syllabusProgressLabel: { color: colors.forest, fontSize: 9, letterSpacing: 1.2, fontWeight: '900' }, syllabusProgressNumber: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, marginTop: 2 }, syllabusProgressTotal: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11 }, syllabusProgressCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 4, borderColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, syllabusProgressPercent: { color: colors.forest, fontSize: 12, fontWeight: '900' }, backlogCard: { borderRadius: 18, borderWidth: 1, borderColor: '#F0D4AA', backgroundColor: '#FFF9EE', marginBottom: 13, overflow: 'hidden' }, backlogHeader: { minHeight: 75, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }, backlogIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE9C4' }, backlogEyebrow: { color: '#9A5D1C', fontSize: 8, letterSpacing: 1, fontWeight: '900' }, backlogTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, marginTop: 2 }, backlogSub: { color: colors.muted, fontSize: 10, marginTop: 2 }, backlogBody: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#F4E1C1' }, backlogHint: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 10, marginBottom: 5 }, backlogTopicRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#F7EBD6', paddingVertical: 7 }, backlogDayPill: { minWidth: 42, paddingHorizontal: 5, paddingVertical: 4, borderRadius: 7, backgroundColor: '#FFE9C4', alignItems: 'center' }, backlogDayText: { color: '#9A5D1C', fontSize: 7, fontWeight: '900' }, backlogTopicTitle: { flex: 1, color: colors.ink, fontSize: 11, lineHeight: 15, fontWeight: '700' }, backlogCheck: { width: 23, height: 23, borderRadius: 7, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, syllabusList: { gap: 15 }, syllabusDayGroup: { borderRadius: 18, padding: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border }, syllabusDayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3, paddingBottom: 7 }, syllabusDayLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1.2, fontWeight: '900' }, syllabusTodayLabel: { color: colors.forest, fontSize: 9, letterSpacing: 1, fontWeight: '900' }, syllabusTopicRow: { minHeight: 43, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 9 }, syllabusTopicRowDone: { opacity: 0.62 }, syllabusCheck: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.moss, alignItems: 'center', justifyContent: 'center' }, syllabusCheckDone: { backgroundColor: colors.forest, borderColor: colors.forest }, syllabusTopicTitle: { flex: 1, color: colors.ink, fontSize: 12, lineHeight: 16, fontWeight: '700' }, syllabusTopicTitleDone: { textDecorationLine: 'line-through', color: colors.muted }, practiceTag: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 3, backgroundColor: colors.peach }, practiceTagText: { color: colors.muted, fontSize: 7, letterSpacing: 0.5, fontWeight: '900' }, syllabusRefresh: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 18 }, syllabusRefreshText: { color: colors.forest, fontSize: 11, fontWeight: '800' },
  syllabusAiHint: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 14, backgroundColor: '#F1F6EF', marginBottom: 13 }, syllabusAiHintText: { flex: 1, color: colors.forest, fontSize: 10, lineHeight: 15, fontWeight: '700' }, syllabusTopicWrap: { borderTopWidth: 1, borderTopColor: colors.border }, syllabusTopicOpen: { flex: 1, minHeight: 36, justifyContent: 'center' }, syllabusTopicChevron: { width: 28, height: 31, alignItems: 'flex-end', justifyContent: 'center' }, syllabusPromptCard: { marginHorizontal: 1, marginBottom: 9, marginTop: 1, padding: 11, borderRadius: 13, backgroundColor: '#F4F8F1', borderWidth: 1, borderColor: '#D3E1CF' }, syllabusPromptHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 }, syllabusPromptIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint }, syllabusPromptTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' }, syllabusPromptSub: { color: colors.muted, fontSize: 9, marginTop: 1 }, syllabusPromptText: { color: colors.ink, fontSize: 11, lineHeight: 16, marginTop: 9 }, syllabusPromptShare: { minHeight: 32, alignSelf: 'flex-start', paddingHorizontal: 9, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.paper, borderWidth: 1, borderColor: '#C9DAC5', marginTop: 10 }, syllabusPromptShareText: { color: colors.forest, fontSize: 10, fontWeight: '800' },
  todayPlanCard: { borderRadius: 18, borderWidth: 1, borderColor: '#CFE0CA', backgroundColor: '#F5FAF3', marginBottom: 13, overflow: 'hidden' }, todayPlanHeader: { minHeight: 64, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }, todayPlanIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint }, todayPlanEyebrow: { color: colors.forest, fontSize: 8, letterSpacing: 1, fontWeight: '900' }, todayPlanTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, marginTop: 2 }, todayPlanBody: { paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#DDE9D9' }, todayTopicCard: { marginTop: 11, padding: 11, borderRadius: 13, backgroundColor: colors.paper, borderWidth: 1, borderColor: '#DDE9D9' }, todayTopicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, todayTopicKind: { flexDirection: 'row', alignItems: 'center', gap: 5 }, todayTopicKindText: { color: colors.forest, fontSize: 8, letterSpacing: 0.9, fontWeight: '900' }, todayCompletePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, backgroundColor: colors.mint }, todayCompleteText: { color: colors.forest, fontSize: 8, fontWeight: '900' }, todayTopicTitle: { color: colors.ink, fontSize: 14, fontWeight: '900', marginTop: 7, marginBottom: 7 }, todayStepRow: { flexDirection: 'row', gap: 8, paddingTop: 8 }, todayStepNumber: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint }, todayStepNumberText: { color: colors.forest, fontSize: 9, fontWeight: '900' }, todayStepTitle: { color: colors.ink, fontSize: 11, fontWeight: '900' }, todayStepText: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 1 }, todaySuccessText: { color: colors.forest, fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 11, paddingTop: 9, borderTopWidth: 1, borderTopColor: '#DDE9D9' }, todayNoPlanText: { color: colors.muted, fontSize: 11, lineHeight: 16, paddingTop: 11 },
  syllabusLoadMore: { minHeight: 47, marginTop: 4, borderRadius: 15, borderWidth: 1, borderColor: '#C8DAC3', backgroundColor: '#F5FAF3', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, syllabusLoadMoreText: { color: colors.forest, fontSize: 12, fontWeight: '900' }, syllabusLoadMoreCount: { color: colors.muted, fontSize: 10, marginLeft: 2 },
  syllabusRoadmap: { gap: 13 }, roadmapPhase: { padding: 13, borderRadius: 19, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border }, roadmapPhaseHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border }, roadmapPhaseIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint }, roadmapPhaseTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 16 }, roadmapPhaseDays: { color: colors.muted, fontSize: 9, marginTop: 2 }, roadmapPhaseCount: { color: colors.forest, fontSize: 8, letterSpacing: 0.6, fontWeight: '900' }, roadmapTopic: { flexDirection: 'row', paddingTop: 11 }, roadmapTimeline: { width: 39, alignItems: 'center' }, roadmapDayDot: { minWidth: 31, height: 23, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, borderWidth: 1, borderColor: colors.border }, roadmapDayDotToday: { backgroundColor: colors.forest, borderColor: colors.forest }, roadmapDayDotText: { color: colors.muted, fontSize: 8, fontWeight: '900' }, roadmapDayDotTextToday: { color: '#fff' }, roadmapLine: { width: 1, flex: 1, minHeight: 21, backgroundColor: colors.border, marginTop: 5 }, roadmapTopicContent: { flex: 1, minWidth: 0, paddingBottom: 5 }, roadmapTopicRow: { minHeight: 29, flexDirection: 'row', alignItems: 'center', gap: 8 }, roadmapTopicOpen: { flex: 1, minHeight: 30, justifyContent: 'center' }, roadmapTodayText: { color: colors.forest, fontSize: 8, letterSpacing: 0.8, fontWeight: '900', marginTop: 3 },
  leaderboardLaunchCard: { minHeight: 104, padding: 15, marginTop: -6, marginBottom: 17, borderRadius: 22, overflow: 'hidden', backgroundColor: '#F0F8ED', borderWidth: 1, borderColor: '#C8DFC1', flexDirection: 'row', alignItems: 'center', gap: 11 }, leaderboardLaunchIcon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest, borderWidth: 1, borderColor: '#376B48' }, leaderboardLaunchEyebrow: { color: colors.forest, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, leaderboardLaunchTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, marginTop: 2 }, leaderboardLaunchSub: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 3 }, leaderboardLaunchArrow: { width: 31, height: 31, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8ECD2' },
  leaderboardScreen: { flex: 1, backgroundColor: colors.canvas }, leaderboardContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 34, backgroundColor: colors.canvas }, leaderboardTopRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, leaderboardBack: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper }, leaderboardTopIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10 }, leaderboardTopIcon: { width: 31, height: 31, borderRadius: 10, borderWidth: 1, borderColor: '#D6C18E', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF4DA' }, leaderboardTopEyebrow: { color: colors.muted, fontSize: 7, letterSpacing: 1, fontWeight: '900' }, leaderboardTopTitle: { color: colors.ink, fontSize: 11, fontWeight: '900', marginTop: 1 }, leaderboardTopLive: { height: 25, paddingHorizontal: 7, borderRadius: 8, borderWidth: 1, borderColor: '#B9D5B1', backgroundColor: '#EEF7E9', flexDirection: 'row', alignItems: 'center', gap: 4 }, leaderboardTopLiveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#2CBB5D' }, leaderboardTopLiveText: { color: colors.forest, fontSize: 7, letterSpacing: .6, fontWeight: '900' }, leaderboardHero: { paddingTop: 22, paddingBottom: 14 }, leaderboardHeroEyebrow: { color: colors.forest, fontSize: 9, letterSpacing: 1.5, fontWeight: '900' }, leaderboardHeroTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 31, lineHeight: 36, letterSpacing: -.6, marginTop: 3 }, leaderboardHeroSub: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, maxWidth: 310 }, leaderboardPrivacyNote: { minHeight: 45, paddingHorizontal: 11, paddingVertical: 9, marginTop: 11, borderRadius: 13, backgroundColor: '#F1F8ED', borderWidth: 1, borderColor: '#C7DEC0', flexDirection: 'row', alignItems: 'center', gap: 8 }, leaderboardPrivacyText: { flex: 1, color: '#49634D', fontSize: 10, lineHeight: 14, fontWeight: '700' }, leaderboardRankHeading: { marginTop: 24, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }, leaderboardRankTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, letterSpacing: -.3 }, leaderboardRankSub: { color: colors.muted, fontSize: 10, marginTop: 2 }, leaderboardRankCount: { minWidth: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5F1E0', borderWidth: 1, borderColor: '#C7DEC0' }, leaderboardRankCountText: { color: colors.forest, fontSize: 11, fontWeight: '900' }, leaderboardRankList: { overflow: 'hidden', borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.paper }, leaderboardRankRow: { minHeight: 72, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }, leaderboardRankRowCurrent: { backgroundColor: '#FFF8E9' }, leaderboardRankDivider: { borderBottomWidth: 1, borderBottomColor: colors.border }, leaderboardRankNumber: { width: 25, height: 25, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6FAF3' }, leaderboardRankNumberText: { fontSize: 10, fontWeight: '900' }, leaderboardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, leaderboardRankName: { color: colors.ink, fontSize: 12, fontWeight: '900', flexShrink: 1 }, leaderboardRankMeta: { color: colors.muted, fontSize: 9, marginTop: 1 }, leaderboardBarTrack: { height: 3, borderRadius: 3, backgroundColor: '#E1EADD', overflow: 'hidden', marginTop: 6, marginRight: 4 }, leaderboardBarFill: { height: '100%', borderRadius: 3 }, leaderboardPointPill: { minWidth: 53, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3, backgroundColor: '#F4F8F1', borderWidth: 1, borderColor: '#D5E2CE' }, leaderboardPointText: { color: colors.ink, fontSize: 9, fontWeight: '900' },
});
