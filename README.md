# Initial code of back-end service with no Authorization, no Validation 
## Fill all methods of ApiServiceImpl
## Introduce the following API end points
### Route "patient"
#### GET /patient/:patientId
- returns JSON presentation of an onbject PatientData 
#### GET /patient/notifications/:notificationId
- returns JSON presentation of an onbject PatientData related to a notification
### Route "notifications"
#### GET /notifications/doctor/:doctor_id
- returns JSON presentation of array of objects NotificationData related to the doctor (sorted by  timestamp in descending order)
#### GET /notifications/patient/:patient_id
- returns JSON presentation of array of objects NotificationData related to the patient (sorted by  timestamp in descending order)
#### GET /notifications/history/:notification_id
-  returns JSON presentation of array of objects ActionData related to the notification (sorted by  timestamp in descending order)
#### POST /notifications/history 
- takes body as object of ActionData (No validation is required at this step)
- returns nothing
## Sanity test using Postman

# Standalone script for population of the table doctor_patient
## There is script seed_db that creates random DB based on secret from SecretsManager service
- the script assumes that all tables have been created by SQL script tables.sql that may be found in the root of the project
- the script truncates all tables
groups: 3<br>
doctors: 10<br>
patients: 50<br>
devices: 50<br>
doctor_patient rows: 59<br>
notifications: 0<br>
notifications_history: 0 <br>
