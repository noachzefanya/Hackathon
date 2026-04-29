/**
 * GuardianFlow AI — Azure Application Insights Client
 * Initializes the AppInsights SDK for page view and event tracking
 */
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';

const reactPlugin = new ReactPlugin();

let appInsights: ApplicationInsights | null = null;

export function initAppInsights(): ApplicationInsights | null {
  if (typeof window === 'undefined') return null;

  const connectionString = process.env.NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING;
  if (!connectionString) {
    console.warn('[AppInsights] Connection string not set — telemetry disabled');
    return null;
  }

  if (appInsights) return appInsights;

  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      // @ts-ignore
      extensions: [reactPlugin],
      enableAutoRouteTracking: true,
      disableAjaxTracking: false,
      autoTrackPageVisitTime: true,
      enableCorsCorrelation: true,
      enableRequestHeaderTracking: true,
      enableResponseHeaderTracking: true,
    },
  });

  appInsights.loadAppInsights();
  appInsights.trackPageView();

  return appInsights;
}

export function trackEvent(name: string, properties?: Record<string, string | number | boolean>) {
  appInsights?.trackEvent({ name }, properties);
}

export function trackException(error: Error, properties?: Record<string, string>) {
  appInsights?.trackException({ exception: error }, properties);
}

export function trackMetric(name: string, value: number) {
  appInsights?.trackMetric({ name, average: value });
}

export { reactPlugin, appInsights };
