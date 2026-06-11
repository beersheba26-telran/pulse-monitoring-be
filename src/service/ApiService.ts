import { ActionData, NotificationData, PatientData } from "../model/api_types";

export default interface ApiService {
    getNotificationsDoctor(doctorId: string): Promise<NotificationData[]>;
    getNotificationsPatient(patientId: string): Promise<NotificationData[]>;
    getPatientByPatientId(patientId: string): Promise<PatientData | null>;
    getPatientByNotificationId(notificationId: string): Promise<PatientData | null>;
    getNotificationHistoryByNotificationId(notificationId: string): Promise<ActionData[]>;
    addActionToNotification(notificationId: string, action: ActionData): Promise<void>;
}