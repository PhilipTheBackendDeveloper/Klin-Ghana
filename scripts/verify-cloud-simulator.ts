import { createIotServer } from '../src/server/iotServer';
import { SmartBinSimulator } from '../simulator';
import http from 'http';

async function runCloudAcceptanceTest() {
  const port = 3008;
  const endpoint = `http://localhost:${port}/api/iot/telemetry`;

  process.env.DEVICE_CREDENTIALS_JSON = JSON.stringify({
    'SB-024': 'klinghana_dev_device_key_sb024',
  });

  const server = createIotServer(port);
  await new Promise<void>((resolve) => server.listen(port, resolve));
  console.log(`[TEST-HARNESS] Local IoT Ingestion endpoint listening on port ${port}`);

  const steps = [
    { name: 'Step 1: Normal Fill (40%)', scenario: '40', expectedStatus: 'NORMAL' },
    { name: 'Step 2: Near Full (88%)', scenario: '88', expectedStatus: 'NEAR_FULL' },
    { name: 'Step 3: Critical Full Threshold (96%)', scenario: '96', expectedStatus: 'FULL' },
    { name: 'Step 4: Overflow Incident (102%)', scenario: '102', expectedStatus: 'OVERFLOW' },
    { name: 'Step 5: Collection Reset (8%)', scenario: '8', expectedStatus: 'NORMAL' },
  ];

  console.log('\n================================================================');
  console.log('  KLINGHANA SMARTBIN SB-024 END-TO-END ACCEPTANCE SEQUENCE TEST');
  console.log('================================================================\n');

  let allPassed = true;

  for (const step of steps) {
    const payload = SmartBinSimulator.generatePayload(step.scenario, { deviceId: 'SB-024' });
    console.log(`--- ${step.name} ---`);
    console.log(`Payload: seq=${payload.sequence} fill=${payload.fillPercentage}% dist=${payload.distanceCm}cm rawDist=${payload.rawDistanceCm}cm gpsFix=${payload.gpsFix}`);

    const res = await SmartBinSimulator.sendHttpTelemetry(payload, endpoint);
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Response Body:`, JSON.stringify(res.body));

    const statusMatches = res.body.evaluatedStatus === step.expectedStatus;
    const ok = res.status === 200 && res.body.success && statusMatches;

    if (!ok) allPassed = false;
    console.log(`Result: ${ok ? 'PASS' : 'FAIL'} (Evaluated: ${res.body.evaluatedStatus}, Expected: ${step.expectedStatus})\n`);
  }

  await new Promise<void>((resolve) => server.close(() => resolve()));
  console.log('================================================================');
  console.log(`ACCEPTANCE SEQUENCE TEST RESULT: ${allPassed ? 'ALL PASSED (5/5 STEPS)' : 'FAILED'}`);
  console.log('================================================================');

  if (!allPassed) process.exit(1);
}

runCloudAcceptanceTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
