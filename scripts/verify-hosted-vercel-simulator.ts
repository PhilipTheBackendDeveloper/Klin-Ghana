import { SmartBinSimulator } from '../simulator';

async function runHostedVercelTest() {
  const hostedEndpoint = 'https://temporary-racing-mandolin-nq6whz1.vercel.app/api/iot/telemetry';
  const deviceKey = 'klinghana_dev_device_key_sb024';

  console.log('================================================================');
  console.log('  KLINGHANA HOSTED VERCEL ACCEPTANCE TEST (40 -> 88 -> 96 -> 102 -> 8)');
  console.log(`  Target URL: ${hostedEndpoint}`);
  console.log('================================================================\n');

  const steps = [
    { scenario: '40', expectedStatus: 'NORMAL', label: '1. Normal Fill (40%)' },
    { scenario: '88', expectedStatus: 'NEAR_FULL', label: '2. Approaching Capacity (88%)' },
    { scenario: '96', expectedStatus: 'FULL', label: '3. Full Threshold Exceeded (96%)' },
    { scenario: '102', expectedStatus: 'OVERFLOW', label: '4. Physical Overflow Incident (102%)' },
    { scenario: '8', expectedStatus: 'NORMAL', label: '5. Post-Collection Reset (8%)' },
  ];

  let seq = 10;
  let allPassed = true;

  for (const step of steps) {
    seq++;
    const payload = SmartBinSimulator.generatePayload(step.scenario, { deviceId: 'SB-024' });
    payload.sequence = seq;
    payload.messageId = `SB-024-VERCEL-${Date.now()}-${seq}`;

    console.log(`--- ${step.label} ---`);
    console.log(`Payload: seq=${payload.sequence} fill=${payload.fillPercentage}% dist=${payload.distanceCm}cm gpsFix=${payload.gpsFix}`);

    const res = await fetch(hostedEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': 'SB-024',
        'X-Device-Key': deviceKey,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    console.log(`HTTP Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(body));

    const statusMatches = body.evaluatedStatus === step.expectedStatus;
    const ok = res.status === 200 && (body.ok === true || body.success === true) && statusMatches;

    if (!ok) allPassed = false;
    console.log(`Step Result: ${ok ? 'PASS' : 'FAIL'} (Evaluated: ${body.evaluatedStatus}, Expected: ${step.expectedStatus})\n`);
  }

  console.log('================================================================');
  console.log(`HOSTED VERCEL SIMULATOR ACCEPTANCE: ${allPassed ? 'ALL 5 STEPS PASSED' : 'FAILED'}`);
  console.log('================================================================');

  if (!allPassed) process.exit(1);
}

runHostedVercelTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
