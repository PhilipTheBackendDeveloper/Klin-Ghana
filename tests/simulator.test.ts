import { describe, it, expect } from 'vitest';
import { SmartBinSimulator } from '../simulator';

describe('SmartBin Simulator Scenario Engine', () => {
  it('generates standard 40% normal payload', () => {
    const payload = SmartBinSimulator.generatePayload('40', { deviceId: 'SB-024' });
    expect(payload.deviceId).toBe('SB-024');
    expect(payload.fillPercentage).toBe(40.0);
    expect(payload.binStatus).toBe('NORMAL');
  });

  it('generates near full 88% payload', () => {
    const payload = SmartBinSimulator.generatePayload('88', { deviceId: 'SB-024' });
    expect(payload.fillPercentage).toBe(88.0);
    expect(payload.binStatus).toBe('NEAR_FULL');
  });

  it('generates critical full 96% payload', () => {
    const payload = SmartBinSimulator.generatePayload('96', { deviceId: 'SB-024' });
    expect(payload.fillPercentage).toBe(96.0);
    expect(payload.binStatus).toBe('FULL');
  });

  it('generates 101.5% overflow payload', () => {
    const payload = SmartBinSimulator.generatePayload('overflow', { deviceId: 'SB-024' });
    expect(payload.fillPercentage).toBeGreaterThanOrEqual(100);
    expect(payload.binStatus).toBe('OVERFLOW');
  });

  it('generates collection reset payload', () => {
    const payload = SmartBinSimulator.generatePayload('collect', { deviceId: 'SB-024' });
    expect(payload.fillPercentage).toBe(8.0);
    expect(payload.binStatus).toBe('NORMAL');
  });
});
