CREATE TABLE public.groups (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  min_value smallint NOT NULL,
  max_value smallint NOT NULL,
  deviation_percent_threshold smallint NOT NULL,
  CONSTRAINT groups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.patients (
  id character varying NOT NULL,
  email character varying,
  grop_id smallint NOT NULL,
  name character varying,
  birthdate date,
  weight smallint,
  height smallint,
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_grop_id_fkey FOREIGN KEY (grop_id) REFERENCES public.groups(id)
);
CREATE TABLE public.devices (
  id character varying NOT NULL,
  patient_id character varying NOT NULL,
  CONSTRAINT devices_pkey PRIMARY KEY (id),
  CONSTRAINT devices_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.notifications (
  id character varying NOT NULL,
  created_at timestamp with time zone NOT NULL,
  type character varying NOT NULL,
  status character varying NOT NULL,
  severity character varying NOT NULL,
  text text NOT NULL,
  device_id character varying,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id)
);
CREATE TABLE public.doctors (
  id character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  name character varying,
  CONSTRAINT doctors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.doctor_patient (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  patient_id character varying NOT NULL,
  doctor_id character varying NOT NULL,
  CONSTRAINT doctor_patient_pkey PRIMARY KEY (id),
  CONSTRAINT doctor_patient_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT doctor_patient_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id)
);
CREATE TABLE public.notifications_history (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  action_date timestamp with time zone NOT NULL DEFAULT now(),
  notification_id character varying NOT NULL,
  doctor_id character varying NOT NULL,
  actuion_type character varying NOT NULL,
  action_description text,
  CONSTRAINT notifications_history_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_history_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id),
  CONSTRAINT notifications_history_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id)
);

ALTER TABLE public.notifications_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_history FORCE ROW LEVEL SECURITY;

CREATE POLICY notifications_history_select_policy
ON public.notifications_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.notifications n
    JOIN public.devices d ON d.id = n.device_id
    WHERE n.id = notification_id
      AND (
        (
          current_setting('app.user_role', true) = 'PATIENT'
          AND d.patient_id = current_setting('app.user_id', true)
        )
        OR (
          current_setting('app.user_role', true) = 'DOCTOR'
          AND EXISTS (
            SELECT 1
            FROM public.doctor_patient dp
            WHERE dp.patient_id = d.patient_id
              AND dp.doctor_id = current_setting('app.user_id', true)
          )
        )
      )
  )
);

CREATE POLICY notifications_history_insert_policy
ON public.notifications_history
FOR INSERT
WITH CHECK (
  current_setting('app.user_role', true) = 'DOCTOR'
  AND doctor_id = current_setting('app.user_id', true)
  AND EXISTS (
    SELECT 1
    FROM public.notifications n
    JOIN public.devices d ON d.id = n.device_id
    JOIN public.doctor_patient dp ON dp.patient_id = d.patient_id
    WHERE n.id = notification_id
      AND dp.doctor_id = current_setting('app.user_id', true)
  )
);