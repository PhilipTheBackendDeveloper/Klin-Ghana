export const DEVICE_CREDENTIALS_ENV = 'DEVICE_CREDENTIALS_JSON';

const DEFAULT_CREDENTIALS: Record<string, string> = {
  'SB-024': 'klinghana_dev_device_key_sb024',
};

export const parseDeviceCredentials = (raw: string | undefined): Record<string, string> => {
  if (!raw) return { ...DEFAULT_CREDENTIALS };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const custom = Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === 'string' && value.length > 0)
        .map(([deviceId, key]) => [deviceId.toUpperCase(), key as string])
    );
    return { ...DEFAULT_CREDENTIALS, ...custom };
  } catch {
    return { ...DEFAULT_CREDENTIALS };
  }
};

export const getDeviceCredential = (deviceId: string): string | undefined => {
  const credentials = parseDeviceCredentials(process.env[DEVICE_CREDENTIALS_ENV]);
  return credentials[deviceId.toUpperCase()];
};

export const verifyDeviceCredential = (deviceId: string, suppliedKey: string): boolean => {
  const expectedKey = getDeviceCredential(deviceId);
  return Boolean(expectedKey) && expectedKey === suppliedKey;
};
