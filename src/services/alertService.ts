/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const alertLogger = {
  info: (msg: string, meta?: any) => console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: msg, ...meta })),
  error: (msg: string, meta?: any) => console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', message: msg, ...meta })),
  warn: (msg: string, meta?: any) => console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: 'warn', message: msg, ...meta })),
};

export type AlertSeverity = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4';
export type AlertCategory =
  | 'critical_server_error'
  | 'payment_provider_failure'
  | 'notification_dead_letter'
  | 'sla_breach'
  | 'backup_failure'
  | 'security_breach';

export interface AlertPayload {
  id: string;
  timestamp: string;
  category: AlertCategory;
  severity: AlertSeverity;
  message: string;
  details?: Record<string, any>;
  correlationId?: string;
  environment?: string;
}

export interface AlertResult {
  delivered: boolean;
  alert: AlertPayload;
  webhookUrl?: string;
  statusCode?: number;
  durationMs?: number;
  error?: string;
}

export interface DispatchAlertOptions {
  category: AlertCategory;
  severity?: AlertSeverity;
  message: string;
  details?: Record<string, any>;
  correlationId?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  fetchHandler?: (url: string, init: any) => Promise<any>;
}

const DEFAULT_SEVERITY_MAP: Record<AlertCategory, AlertSeverity> = {
  critical_server_error: 'SEV-1',
  payment_provider_failure: 'SEV-1',
  backup_failure: 'SEV-1',
  security_breach: 'SEV-1',
  notification_dead_letter: 'SEV-2',
  sla_breach: 'SEV-3',
};

// In-memory audit buffer for alert history
const alertHistoryBuffer: AlertResult[] = [];

export function getAlertHistory(): AlertResult[] {
  return [...alertHistoryBuffer];
}

export function clearAlertHistory(): void {
  alertHistoryBuffer.length = 0;
}

/**
 * Sanitize secrets/tokens from alert details to prevent credential leaks in logs or payloads
 */
export function sanitizeAlertDetails(obj: Record<string, any>): Record<string, any> {
  const SENSITIVE_KEYS = ['secret', 'token', 'authorization', 'key', 'password', 'bearer', 'cvv', 'card'];
  const clean: Record<string, any> = {};

  for (const [key, val] of Object.entries(obj || {})) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      clean[key] = '[REDACTED]';
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeAlertDetails(val);
    } else {
      clean[key] = val;
    }
  }

  return clean;
}

/**
 * Centralized Server-Side Alert Dispatcher with Webhook Delivery & Fail-Closed Logging
 */
export async function dispatchAlert(options: DispatchAlertOptions): Promise<AlertResult> {
  const alertId = `ALT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const severity = options.severity || DEFAULT_SEVERITY_MAP[options.category] || 'SEV-2';
  const environment = process.env.NODE_ENV || 'development';

  const alertPayload: AlertPayload = {
    id: alertId,
    timestamp: new Date().toISOString(),
    category: options.category,
    severity,
    message: options.message,
    details: sanitizeAlertDetails(options.details || {}),
    correlationId: options.correlationId,
    environment,
  };

  const isProduction = process.env.NODE_ENV === 'production';
  const webhookUrl = options.webhookUrl || process.env.ALERT_WEBHOOK_URL;
  const webhookSecret = options.webhookSecret || process.env.ALERT_WEBHOOK_SECRET;

  if (isProduction && (!webhookUrl || !webhookSecret)) {
    throw new Error('ALERT_WEBHOOK_CONFIG_REQUIRED: ALERT_WEBHOOK_URL and ALERT_WEBHOOK_SECRET environment variables are required in production environment.');
  }

  const targetWebhookUrl = webhookUrl || (options.fetchHandler ? 'http://localhost/alert-webhook' : undefined);

  const startTime = Date.now();

  if (!targetWebhookUrl) {
    const unconfiguredResult: AlertResult = {
      delivered: false,
      alert: alertPayload,
      error: 'ALERT_WEBHOOK_NOT_CONFIGURED: Missing ALERT_WEBHOOK_URL or webhookUrl option',
      durationMs: 0,
    };
    alertHistoryBuffer.push(unconfiguredResult);
    return unconfiguredResult;
  }

  let result: AlertResult = {
    delivered: false,
    alert: alertPayload,
    webhookUrl: targetWebhookUrl,
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'HCI-CMD-Platform-AlertDispatcher/1.0',
    };
    if (webhookSecret) {
      headers['X-Alert-Secret'] = webhookSecret;
    }

    let fetchRes: any;

    if (options.fetchHandler) {
      fetchRes = await options.fetchHandler(targetWebhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(alertPayload),
      });
    } else {
      // AbortController with 5-second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(targetWebhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(alertPayload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        fetchRes = {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        };
      } catch (err: any) {
        clearTimeout(timeoutId);
        throw err;
      }
    }

    const durationMs = Date.now() - startTime;

    if (fetchRes && (fetchRes.ok || fetchRes.status === 200 || fetchRes.status === 201 || fetchRes.status === 202)) {
      result = {
        delivered: true,
        alert: alertPayload,
        webhookUrl,
        statusCode: fetchRes.status || 200,
        durationMs,
      };

      try {
        alertLogger.info(`[Alert Delivered] Category: ${options.category} (${severity}) - ID: ${alertId}`, {
          alertId,
          category: options.category,
          severity,
          webhookUrl,
          statusCode: result.statusCode,
          durationMs,
        });
      } catch {
        // Fallback console log if logger unavailable
        console.log(`[Alert Delivered] Category: ${options.category} (${severity}) - ID: ${alertId}`);
      }
    } else {
      result = {
        delivered: false,
        alert: alertPayload,
        webhookUrl,
        statusCode: fetchRes?.status || 500,
        durationMs,
        error: `HTTP_${fetchRes?.status || 500}: ${fetchRes?.statusText || 'Webhook delivery failed'}`,
      };

      try {
        alertLogger.error(`[Alert Delivery Failed] Category: ${options.category} (${severity}) - ID: ${alertId}`, {
          alertId,
          category: options.category,
          severity,
          webhookUrl,
          statusCode: result.statusCode,
          error: result.error,
        });
      } catch {
        console.error(`[Alert Delivery Failed] Category: ${options.category} (${severity}) - ID: ${alertId}`);
      }
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    result = {
      delivered: false,
      alert: alertPayload,
      webhookUrl,
      durationMs,
      error: err.name === 'AbortError' ? 'WEBHOOK_TIMEOUT: Alert delivery timed out after 5000ms' : err.message,
    };

    try {
      alertLogger.error(`[Alert Dispatch Error] Category: ${options.category} (${severity}) - ID: ${alertId}`, {
        alertId,
        category: options.category,
        severity,
        webhookUrl,
        error: result.error,
      });
    } catch {
      console.error(`[Alert Dispatch Error] Category: ${options.category} (${severity}) - ID: ${alertId}`);
    }
  }

  alertHistoryBuffer.push(result);
  return result;
}
