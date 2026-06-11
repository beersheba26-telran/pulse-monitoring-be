import {
	GetSecretValueCommand,
	SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

const SECRET_KEYS = {
	postgresqlUri: "URI",
	mongodbUri: "MONGO_URI",
	mongodbDbName: "MONGO_DB_NAME",
	reducedValuesCollection: "REDUCED_VALUES_COLLECTION",
	jumpsValuesCollection: "JUMPS_VALUES_COLLECTION",
} as const;

type SecretObject = Record<string, string>;

let client: SecretsManagerClient | null = null;

function getRegion(): string {
	return process.env.AWS_REGION  ?? "us-east-1";
}

function getSecretId(): string {
	const secretId = process.env.SECRET_ARN;
    if (!secretId || !secretId.trim()) {
        throw new Error("Environment variable 'SECRET_ARN' is missing or empty.");
    }
	return secretId;
}

function getSecretsClient(): SecretsManagerClient {
	if (!client) {
		client = new SecretsManagerClient({ region: getRegion() });
	}

	return client;
}

function parseSecretObject(raw: string): SecretObject {
	const payload = raw.trim();
	if (!payload) {
		throw new Error("Secrets Manager returned an empty secret payload.");
	}

	const parsed = JSON.parse(payload) as Record<string, unknown>;
	const normalized: SecretObject = {};

	for (const [key, value] of Object.entries(parsed)) {
		if (typeof value === "string") {
			normalized[key] = value;
		}
	}

	if (Object.keys(normalized).length === 0) {
		throw new Error("Secret JSON does not contain any string values.");
	}

	return normalized;
}

function throwMissingSecretPayload(secretId: string): never {
	throw new Error(`Secret '${secretId}' does not contain SecretString or SecretBinary.`);
}

async function loadSecretObject(): Promise<SecretObject> {
	const secretId = getSecretId();
	const response = await getSecretsClient().send(
		new GetSecretValueCommand({ SecretId: secretId })
	);
	const rawSecret =
		response.SecretString ??
		(response.SecretBinary ? new TextDecoder().decode(response.SecretBinary) : null) ??
		throwMissingSecretPayload(secretId);

	return parseSecretObject(rawSecret);
}

function normalizePostgreSQLUri(uri: string): string {
	try {
		new URL(uri);
		return uri;
	} catch {
		const match = uri.match(/^(postgres(?:ql)?:\/\/)([^:/?#]+):([^@]*)@(.+)$/i);
		if (!match) {
			throw new Error("Invalid PostgreSQL URI format.");
		}

		const [, scheme, username, rawPassword, rest] = match;
		let decodedPassword = rawPassword;
		try {
			decodedPassword = decodeURIComponent(rawPassword);
		} catch {
			decodedPassword = rawPassword;
		}

		const encodedPassword = encodeURIComponent(decodedPassword);
		const normalized = `${scheme}${username}:${encodedPassword}@${rest}`;
		new URL(normalized);
		return normalized;
	}
}

export async function getSecretValueByKey(secretKey: string): Promise<string> {
	const secret = await loadSecretObject();
	const value = secret[secretKey];
	if (!value || !value.trim()) {
		throw new Error(`Secret key '${secretKey}' is missing or empty.`);
	}

	return value;
}

export async function getPostgreSQLUri(): Promise<string> {
	const uri = await getSecretValueByKey(SECRET_KEYS.postgresqlUri);
	return normalizePostgreSQLUri(uri);
}

export async function getMongoUri(): Promise<string> {
	return getSecretValueByKey(SECRET_KEYS.mongodbUri);
}

export async function getMongoDbName(): Promise<string> {
	return getSecretValueByKey(SECRET_KEYS.mongodbDbName);
}

export async function getReducedValuesCollection(): Promise<string> {
	return getSecretValueByKey(SECRET_KEYS.reducedValuesCollection);
}

export async function getJumpsValuesCollection(): Promise<string> {
	return getSecretValueByKey(SECRET_KEYS.jumpsValuesCollection);
}


