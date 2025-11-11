import type { Analytics, AnalyticsEventParameters } from 'firebase/analytics';
import { getAnalytics, isSupported, logEvent, setUserId, setUserProperties } from 'firebase/analytics';

import { firebaseApp } from './firebaseApp';

let analyticsInstance: Analytics | null = null;
let analyticsPromise: Promise<Analytics | null> | null = null;

const ensureAnalytics = async (): Promise<Analytics | null> => {
  if (analyticsInstance) {
    return analyticsInstance;
  }

  if (analyticsPromise) {
    return analyticsPromise;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  analyticsPromise = isSupported()
    .then((supported) => {
      if (!supported) {
        return null;
      }

      const analytics = getAnalytics(firebaseApp);
      analyticsInstance = analytics;
      return analytics;
    })
    .catch((error) => {
      console.warn('Failed to initialize Firebase Analytics.', error);
      return null;
    });

  return analyticsPromise;
};

export const logAnalyticsEvent = async (
  eventName: string,
  parameters?: AnalyticsEventParameters,
): Promise<void> => {
  try {
    const analytics = await ensureAnalytics();
    if (!analytics) {
      return;
    }

    logEvent(analytics, eventName, parameters);
  } catch (error) {
    console.warn('Failed to record analytics event.', { eventName, error });
  }
};

export const setAnalyticsUser = async (
  userId: string | null,
  properties?: Record<string, string | undefined>,
): Promise<void> => {
  try {
    const analytics = await ensureAnalytics();
    if (!analytics) {
      return;
    }

    if (userId) {
      setUserId(analytics, userId);
    }

    if (properties) {
      const sanitizedEntries = Object.entries(properties).filter(([, value]) => typeof value === 'string');
      if (sanitizedEntries.length > 0) {
        const sanitized = Object.fromEntries(sanitizedEntries) as Record<string, string>;
        setUserProperties(analytics, sanitized);
      }
    }
  } catch (error) {
    console.warn('Failed to update analytics user context.', error);
  }
};

export const clearAnalyticsUser = async (): Promise<void> => {
  try {
    const analytics = await ensureAnalytics();
    if (!analytics) {
      return;
    }

    setUserId(analytics, undefined);
  } catch (error) {
    console.warn('Failed to clear analytics user context.', error);
  }
};
