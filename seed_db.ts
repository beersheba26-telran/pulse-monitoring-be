import "dotenv/config";
import { Client } from "pg";
import { getPostgreSQLUri } from "./src/service/db_conection_parameters.js";

type Pair = { patientId: string; doctorId: string };

const GROUP_COUNT = 3;
const PATIENT_COUNT = 50;
const DOCTOR_COUNT = 10;
const DEVICE_COUNT = 50;
const DOCTOR_MIN_PATIENTS = 5;
const DOCTOR_MAX_PATIENTS = 7;
const PATIENT_MIN_DOCTORS = 1;
const PATIENT_MAX_DOCTORS = 3;

async function getDbUri(): Promise<string> {
  return getPostgreSQLUri();
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function generateDoctorTargets(): number[] {
  // Keep trying until we can give each patient at least one doctor.
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const targets = Array.from({ length: DOCTOR_COUNT }, () =>
      randInt(DOCTOR_MIN_PATIENTS, DOCTOR_MAX_PATIENTS)
    );
    const total = targets.reduce((acc, value) => acc + value, 0);
    if (total >= PATIENT_COUNT) {
      return targets;
    }
  }

  throw new Error("Failed to generate valid doctor capacity targets.");
}

function buildDoctorPatientPairs(patientIds: string[], doctorIds: string[]): Pair[] {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const doctorTargets = generateDoctorTargets();
    const doctorRemaining = [...doctorTargets];
    const patientDoctorCount = new Map<string, number>(
      patientIds.map((id) => [id, 0])
    );
    const pairSet = new Set<string>();
    const pairs: Pair[] = [];

    // First pass: ensure every patient has at least one doctor.
    for (const patientId of patientIds) {
      const candidateDoctorIndexes = doctorRemaining
        .map((remaining, index) => ({ remaining, index }))
        .filter((item) => item.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining)
        .map((item) => item.index);

      if (candidateDoctorIndexes.length === 0) {
        break;
      }

      const doctorIndex = candidateDoctorIndexes[0];
      const doctorId = doctorIds[doctorIndex];
      const key = `${patientId}|${doctorId}`;

      if (!pairSet.has(key)) {
        pairSet.add(key);
        pairs.push({ patientId, doctorId });
        doctorRemaining[doctorIndex] -= 1;
        patientDoctorCount.set(patientId, 1);
      }
    }

    if (pairs.length !== patientIds.length) {
      continue;
    }

    // Second pass: consume the remaining doctor capacities.
    const doctorsWithRemaining = (): number[] =>
      doctorRemaining
        .map((remaining, index) => ({ remaining, index }))
        .filter((item) => item.remaining > 0)
        .map((item) => item.index);

    let guard = 0;
    while (doctorsWithRemaining().length > 0 && guard < 20000) {
      guard += 1;
      const doctorIndex = pickRandom(doctorsWithRemaining());
      const doctorId = doctorIds[doctorIndex];

      const eligiblePatients = patientIds.filter((patientId) => {
        const count = patientDoctorCount.get(patientId) ?? 0;
        if (count >= PATIENT_MAX_DOCTORS) {
          return false;
        }

        const key = `${patientId}|${doctorId}`;
        return !pairSet.has(key);
      });

      if (eligiblePatients.length === 0) {
        // Cannot satisfy this random configuration; try again.
        break;
      }

      const patientId = pickRandom(eligiblePatients);
      const key = `${patientId}|${doctorId}`;
      pairSet.add(key);
      pairs.push({ patientId, doctorId });
      doctorRemaining[doctorIndex] -= 1;
      patientDoctorCount.set(patientId, (patientDoctorCount.get(patientId) ?? 0) + 1);
    }

    const allDoctorTargetsMet = doctorRemaining.every((remaining) => remaining === 0);
    const allPatientsHaveMin = patientIds.every(
      (patientId) => (patientDoctorCount.get(patientId) ?? 0) >= PATIENT_MIN_DOCTORS
    );
    const allPatientsWithinMax = patientIds.every(
      (patientId) => (patientDoctorCount.get(patientId) ?? 0) <= PATIENT_MAX_DOCTORS
    );

    if (allDoctorTargetsMet && allPatientsHaveMin && allPatientsWithinMax) {
      return pairs;
    }
  }

  throw new Error("Failed to generate doctor_patient rows with requested constraints.");
}

async function main(): Promise<void> {
  const client = new Client({ connectionString: await getDbUri() });
  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      TRUNCATE TABLE
        public.notifications_history,
        public.notifications,
        public.doctor_patient,
        public.devices,
        public.patients,
        public.doctors,
        public.groups
      RESTART IDENTITY CASCADE;
    `);

    const groupInsertResult = await client.query<{ id: number }>(
      `
      INSERT INTO public.groups (min_value, max_value, deviation_percent_threshold)
      VALUES
        (50, 90, 10),
        (70, 120, 15),
        (90, 150, 20)
      RETURNING id;
      `
    );

    const groupIds = groupInsertResult.rows.map((row) => row.id);
    if (groupIds.length !== GROUP_COUNT) {
      throw new Error(`Expected ${GROUP_COUNT} groups, got ${groupIds.length}.`);
    }

    const doctors = Array.from({ length: DOCTOR_COUNT }, (_, index) => ({
      id: `doc_${String(index + 1).padStart(2, "0")}`,
      email: `doctor${index + 1}@seed.local`,
      name: `Doctor ${index + 1}`,
    }));

    for (const doctor of doctors) {
      await client.query(
        `INSERT INTO public.doctors (id, email, name) VALUES ($1, $2, $3);`,
        [doctor.id, doctor.email, doctor.name]
      );
    }

    const patients = Array.from({ length: PATIENT_COUNT }, (_, index) => ({
      id: `pat_${String(index + 1).padStart(3, "0")}`,
      email: `patient${index + 1}@seed.local`,
      gropId: groupIds[index % groupIds.length],
      name: `Patient ${index + 1}`,
      birthdate: `19${randInt(65, 99)}-${String(randInt(1, 12)).padStart(2, "0")}-${String(
        randInt(1, 28)
      ).padStart(2, "0")}`,
      weight: randInt(50, 110),
      height: randInt(150, 195),
    }));

    for (const patient of patients) {
      await client.query(
        `
        INSERT INTO public.patients (id, email, grop_id, name, birthdate, weight, height)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
        `,
        [
          patient.id,
          patient.email,
          patient.gropId,
          patient.name,
          patient.birthdate,
          patient.weight,
          patient.height,
        ]
      );
    }

    if (DEVICE_COUNT !== PATIENT_COUNT) {
      throw new Error("DEVICE_COUNT must match PATIENT_COUNT for one-to-one mapping.");
    }

    for (let i = 0; i < DEVICE_COUNT; i += 1) {
      const patientId = patients[i].id;
      const deviceId = `dev_${String(i + 1).padStart(3, "0")}`;
      await client.query(
        `INSERT INTO public.devices (id, patient_id) VALUES ($1, $2);`,
        [deviceId, patientId]
      );
    }

    // notifications and notifications_history are intentionally left empty.

    const doctorPatientPairs = buildDoctorPatientPairs(
      patients.map((p) => p.id),
      doctors.map((d) => d.id)
    );

    for (const pair of doctorPatientPairs) {
      await client.query(
        `INSERT INTO public.doctor_patient (patient_id, doctor_id) VALUES ($1, $2);`,
        [pair.patientId, pair.doctorId]
      );
    }

    await client.query("COMMIT");

    console.log("Seed completed successfully.");
    console.log(`groups: ${groupIds.length}`);
    console.log(`doctors: ${doctors.length}`);
    console.log(`patients: ${patients.length}`);
    console.log(`devices: ${DEVICE_COUNT}`);
    console.log(`doctor_patient rows: ${doctorPatientPairs.length}`);
    console.log("notifications: 0");
    console.log("notifications_history: 0");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed.");
  console.error(error);
  process.exit(1);
});
