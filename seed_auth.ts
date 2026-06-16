import "dotenv/config";
import {
	AdminAddUserToGroupCommand,
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand,
	AdminUpdateUserAttributesCommand,
	CognitoIdentityProviderClient,
	CreateGroupCommand,
	ListGroupsCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const REGION = process.env.AWS_REGION ?? "us-east-1";
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const PASSWORD = "12345.Com";

const DOCTOR_GROUP = "DOCTOR";
const PATIENT_GROUP = "PATIENT";

const DOCTOR_COUNT = 10;
const PATIENT_COUNT = 50;

type SeedUser = {
	username: string;
	email: string;
	group: string;
};

if (!USER_POOL_ID) {
	throw new Error("Missing COGNITO_USER_POOL_ID in environment.");
}

const cognito = new CognitoIdentityProviderClient({ region: REGION });

function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

function pad3(value: number): string {
	return String(value).padStart(3, "0");
}

function buildUsers(): SeedUser[] {
	const doctors: SeedUser[] = Array.from({ length: DOCTOR_COUNT }, (_, idx) => {
		const n = idx + 1;
		return {
			username: `doc_${pad2(n)}`,
			email: `doctor${n}@seed.local`,
			group: DOCTOR_GROUP,
		};
	});

	const patients: SeedUser[] = Array.from({ length: PATIENT_COUNT }, (_, idx) => {
		const n = idx + 1;
		return {
			username: `pat_${pad3(n)}`,
			email: `patient${n}@seed.local`,
			group: PATIENT_GROUP,
		};
	});

	return [...doctors, ...patients];
}

async function listAllGroupNames(): Promise<Set<string>> {
	const names = new Set<string>();
	let nextToken: string | undefined = undefined;

	do {
		const response:any = await cognito.send(
			new ListGroupsCommand({
				UserPoolId: USER_POOL_ID,
				NextToken: nextToken,
			})
		);

		for (const g of response.Groups ?? []) {
			if (g.GroupName) {
				names.add(g.GroupName);
			}
		}

		nextToken = response.NextToken;
	} while (nextToken);

	return names;
}

async function ensureGroupsExist(): Promise<void> {
	const existing = await listAllGroupNames();

	for (const groupName of [DOCTOR_GROUP, PATIENT_GROUP]) {
		if (existing.has(groupName)) {
			console.log(`Group exists: ${groupName}`);
			continue;
		}

		await cognito.send(
			new CreateGroupCommand({
				UserPoolId: USER_POOL_ID,
				GroupName: groupName,
			})
		);
		console.log(`Group created: ${groupName}`);
	}
}

async function upsertUser(user: SeedUser): Promise<"created" | "updated"> {
	let created = false;

	try {
		await cognito.send(
			new AdminCreateUserCommand({
				UserPoolId: USER_POOL_ID,
				Username: user.username,
				TemporaryPassword: PASSWORD,
				MessageAction: "SUPPRESS",
				UserAttributes: [
					{ Name: "email", Value: user.email },
					{ Name: "email_verified", Value: "true" },
				],
			})
		);
		created = true;
	} catch (error: unknown) {
		const code =
			typeof error === "object" &&
			error !== null &&
			"name" in error &&
			typeof (error as { name?: unknown }).name === "string"
				? (error as { name: string }).name
				: "UnknownError";

		if (code !== "UsernameExistsException") {
			throw error;
		}
	}

	// Keep email and verification flag aligned for both newly-created and existing users.
	await cognito.send(
		new AdminUpdateUserAttributesCommand({
			UserPoolId: USER_POOL_ID,
			Username: user.username,
			UserAttributes: [
				{ Name: "email", Value: user.email },
				{ Name: "email_verified", Value: "true" },
			],
		})
	);

	// Force the shared permanent password (not temporary).
	await cognito.send(
		new AdminSetUserPasswordCommand({
			UserPoolId: USER_POOL_ID,
			Username: user.username,
			Password: PASSWORD,
			Permanent: true,
		})
	);

	await cognito.send(
		new AdminAddUserToGroupCommand({
			UserPoolId: USER_POOL_ID,
			Username: user.username,
			GroupName: user.group,
		})
	);

	return created ? "created" : "updated";
}

async function main(): Promise<void> {
	await ensureGroupsExist();

	const users = buildUsers();

	let createdCount = 0;
	let updatedCount = 0;

	for (const user of users) {
		const result = await upsertUser(user);
		if (result === "created") {
			createdCount += 1;
		} else {
			updatedCount += 1;
		}

		console.log(`[${result.toUpperCase()}] ${user.username} -> ${user.group}`);
	}

	console.log("Auth seed completed.");
	console.log(`Total users processed: ${users.length}`);
	console.log(`Created: ${createdCount}`);
	console.log(`Updated (already existed): ${updatedCount}`);
	console.log(`Doctors: ${DOCTOR_COUNT}, Patients: ${PATIENT_COUNT}`);
}

main().catch((error: unknown) => {
	console.error("Auth seed failed.");
	console.error(error);
	process.exit(1);
});
