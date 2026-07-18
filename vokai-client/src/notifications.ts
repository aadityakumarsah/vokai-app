import { Platform } from 'react-native';

// Expo Go SDK 53+ intentionally throws while loading expo-notifications.
// Keep the import lazy so the rest of VOKAI still runs in Expo Go; native
// development builds get the full reminder implementation.
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  Notifications = null;
}

const REMINDER_ID = 'vokai-daily-learning';

export async function setDailyReminder(enabled: boolean, time: string) {
  try {
    const nativeNotifications = Notifications;
    if (!nativeNotifications) return false;
    await nativeNotifications.cancelScheduledNotificationAsync(REMINDER_ID);
    if (!enabled) return true;
    const current = await nativeNotifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') status = (await nativeNotifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return false;

    if (Platform.OS === 'android') {
      await nativeNotifications.setNotificationChannelAsync('vokai-learning', {
        name: 'Daily learning reminders',
        importance: nativeNotifications.AndroidImportance.DEFAULT,
      });
    }

    const [hour = 19, minute = 0] = time.split(':').map(Number);
    await nativeNotifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: 'Your VOKAI session is ready 🌿',
        body: 'A small step today keeps your 90-day garden growing.',
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: 'vokai-learning' } : {}),
      },
      trigger: {
        type: nativeNotifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return true;
  } catch {
    return false;
  }
}
