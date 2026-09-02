export const DEVICE_CREDENTIALS_ENV = 'DEVICE_CREDENTIALS_JSON';

export const parseDeviceCredentials = (raw: string | undefined): Record<string, string> => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === 'string' && value.length > 0)
        .map(([deviceId, key]) => [deviceId.toUpperCase(), key as string])
    );
  } catch {
    return {};
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
