import { ActionData, NotificationData, PatientData } from "../model/api_types";
import ApiService from "./ApiService";
import { getJumpsValuesCollection, getMongoDbName, getMongoUri, getPostgreSQLUri, getReducedValuesCollection } from "./db_conection_parameters";
const  POSTGRESQL_URI = getPostgreSQLUri();
const MONGO_URI = getMongoUri();
const MONGO_DB_NAME = getMongoDbName();
const REDUCED_VALUES_COLLECTION = getReducedValuesCollection();


export default class ApiServiceImpl implements ApiService {
    async getNotificationsDoctor(doctorId: string): Promise<NotificationData[]> {
        // Implementation here
        return [];
    }

    async getNotificationsPatient(patientId: string): Promise<NotificationData[]> {
        // Implementation here
        return [];
    }

    async getPatientByPatientId(patientId: string): Promise<PatientData | null> {
        // Implementation here
        return null;
    }

    async getPatientByNotificationId(notificationId: string): Promise<PatientData | null> {
        // Implementation here
        return null;
    }

    async getNotificationHistoryByNotificationId(notificationId: string): Promise<ActionData[]> {
        // Implementation here
        return [];
    }

    async addActionToNotification(notificationId: string, action: ActionData): Promise<void> {
        // Implementation here
    }
}
