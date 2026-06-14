import { ActionData, NotificationData, PatientData } from "../model/api_types";
import ApiService from "./ApiService";
import { getMongoDbName, getMongoUri, getPostgreSQLUri, getReducedValuesCollection } from "./db_conection_parameters";
import { knex, Knex } from "knex";
import { MongoClient } from "mongodb";
const  POSTGRESQL_URI = getPostgreSQLUri();
const MONGO_URI = getMongoUri();
const MONGO_DB_NAME = getMongoDbName();
const REDUCED_VALUES_COLLECTION = getReducedValuesCollection();

type NotificationRow = {
    id: string;
    patientId: string;
    message: string;
    timestamp: Date | string;
    type: string;
    severity: string;
    status: string;
};

type NotificationHistoryRow = {
    action: string;
    timestamp: Date | string;
    report: string | null;
    doctor_name: string | null;
};

type PatientRow = {
    id: string;
    name: string | null;
    birthdate: Date | string | null;
    weight: number | null;
    height: number | null;
};

type DoctorRow = {
    doctor_id: string;
};

type DeviceRow = {
    id: string;
};

type PulseValueDocument = {
    device_id: string;
    pulse_value: number;
    date: string;
};

type NotificationPatientRow = {
    patientId: string;
};

let knexClient: Knex | null = null;
let knexClientPromise: Promise<Knex> | null = null;
let mongoClient: MongoClient | null = null;
let mongoClientPromise: Promise<MongoClient> | null = null;

async function getKnexClient(): Promise<Knex> {
    if (!knexClientPromise) {
        knexClientPromise = POSTGRESQL_URI.then((connectionString) => {
            if (!knexClient) {
                knexClient = knex({
                    client: "pg",
                    connection: connectionString,
                });
            }

            return knexClient;
        }).catch((error) => {
            knexClientPromise = null;
            throw error;
        });
    }

    return knexClientPromise;
}

async function getMongoClient(): Promise<MongoClient> {
    if (!mongoClientPromise) {
        mongoClientPromise = MONGO_URI.then((uri) => {
            if (!mongoClient) {
                mongoClient = new MongoClient(uri);
            }

            return mongoClient.connect().then(() => mongoClient as MongoClient);
        }).catch((error) => {
            mongoClientPromise = null;
            throw error;
        });
    }

    return mongoClientPromise;
}

function getAge(birthdate: Date | string | null): number {
    if (!birthdate) {
        return 0;
    }

    const birth = new Date(birthdate);
    if (Number.isNaN(birth.getTime())) {
        return 0;
    }

    const now = new Date();
    let age = now.getUTCFullYear() - birth.getUTCFullYear();
    const monthDiff = now.getUTCMonth() - birth.getUTCMonth();

    if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
        age -= 1;
    }

    return Math.max(age, 0);
}

async function getLatestPulseValues(deviceIds: string[]): Promise<number[]> {
    if (deviceIds.length === 0) {
        return [];
    }

    const mongo = await getMongoClient();
    const docs = await mongo
        .db(await MONGO_DB_NAME)
        .collection<PulseValueDocument>(await REDUCED_VALUES_COLLECTION)
        .find(
            { device_id: { $in: deviceIds } },
            { projection: { _id: 0, pulse_value: 1, date: 1 } }
        )
        .sort({ date: -1 })
        .limit(5)
        .toArray();

    return docs.map((doc) => doc.pulse_value);
}

async function buildPatientData(patientId: string): Promise<PatientData | null> {
    const db = await getKnexClient();
    const patient = await db<PatientRow>("patients")
        .select("id", "name", "birthdate", "weight", "height")
        .where("id", patientId)
        .first();

    if (!patient) {
        return null;
    }

    const [doctorRows, deviceRows] = await Promise.all([
        db<DoctorRow>("doctor_patient").select("doctor_id").where("patient_id", patient.id),
        db<DeviceRow>("devices").select("id").where("patient_id", patient.id),
    ]);

    return {
        id: patient.id,
        name: patient.name ?? "",
        age: getAge(patient.birthdate),
        doctor_ids: doctorRows.map((row) => row.doctor_id),
        lastHeartRateValues: await getLatestPulseValues(deviceRows.map((row) => row.id)),
        weight: patient.weight ?? 0,
        height: patient.height ?? 0,
    };
}

function applyNotificationSelection(query: Knex.QueryBuilder): Knex.QueryBuilder<NotificationRow[]> {
    return query
        .select(
            "n.id",
            { patientId: "d.patient_id" },
            { message: "n.text" },
            { timestamp: "n.created_at" },
            "n.type",
            "n.severity",
            "n.status"
        )
        .orderBy("n.created_at", "desc");
}

function mapNotificationRow(row: NotificationRow): NotificationData {
    return {
        id: row.id,
        patientId: row.patientId,
        message: row.message,
        timestamp: new Date(row.timestamp).toISOString(),
        type: row.type,
        severity: row.severity,
        status: row.status,
    };
}


class ApiServiceImpl implements ApiService {
    async getNotificationsDoctor(doctorId: string): Promise<NotificationData[]> {
        const rows = await applyNotificationSelection((await getKnexClient())<NotificationRow>("doctor_patient as dp")
            .innerJoin("devices as d", "d.patient_id", "dp.patient_id")
            .innerJoin("notifications as n", "n.device_id", "d.id")
            .where("dp.doctor_id", doctorId));

        return rows.map(mapNotificationRow);
    }

    async getNotificationsPatient(patientId: string): Promise<NotificationData[]> {
        const rows = await applyNotificationSelection((await getKnexClient())<NotificationRow>("devices as d")
            .innerJoin("notifications as n", "n.device_id", "d.id")
            .where("d.patient_id", patientId));

        return rows.map(mapNotificationRow);
    }

    async getPatientByPatientId(patientId: string): Promise<PatientData | null> {
        return buildPatientData(patientId);
    }

    async getPatientByNotificationId(notificationId: string): Promise<PatientData | null> {
        const row = await (await getKnexClient())<NotificationPatientRow>("notifications as n")
            .innerJoin("devices as d", "d.id", "n.device_id")
            .where("n.id", notificationId)
            .select({ patientId: "d.patient_id" })
            .first();

        if (!row) {
            return null;
        }

        return buildPatientData(row.patientId);
    }

    async getNotificationHistoryByNotificationId(notificationId: string): Promise<ActionData[]> {
        const rows = await (await getKnexClient())<NotificationHistoryRow>("notifications_history as nh")
            .innerJoin("doctors as d", "d.id", "nh.doctor_id")
            .where("nh.notification_id", notificationId)
            .select(
                { action: "nh.actuion_type" },
                { timestamp: "nh.action_date" },
                { report: "nh.action_description" },
                { doctor_name: "d.name" }
            )
            .orderBy("nh.action_date", "desc");

        return rows.map((row) => ({
            action: row.action,
            timestamp: new Date(row.timestamp).toISOString(),
            report: row.report ?? "",
            doctor_name: row.doctor_name ?? "",
        }));
    }

    async addActionToNotification(notificationId: string, action: ActionData): Promise<void> {
        const db = await getKnexClient();

        await db.transaction(async (trx) => {
            const doctors = await trx<{ id: string }>("doctors")
                .select("id")
                .where("id", action.doctor_name);

            if (doctors.length === 0) {
                throw new Error(`Doctor not found for name '${action.doctor_name}'.`);
            }

            if (doctors.length > 1) {
                throw new Error(`Multiple doctors found for name '${action.doctor_name}'.`);
            }

            const updatedRows = await trx("notifications")
                .where("id", notificationId)
                .update({ status: action.action });

            if (updatedRows === 0) {
                throw new Error(`Notification '${notificationId}' was not found.`);
            }

            await trx("notifications_history").insert({
                notification_id: notificationId,
                doctor_id: doctors[0].id,
                actuion_type: action.action,
                action_description: action.report,
                action_date: action.timestamp,
            });
        });
    }
}

const apiService: ApiService = new ApiServiceImpl();

export default apiService;
