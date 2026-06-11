export type Env = {
  nodeEnv: string;
  port: number;
};

function readPort(value: string | undefined): number {
  if (!value) {
    return 3000;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return parsed;
}

export function getEnv(): Env {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: readPort(process.env.PORT)
  };
}
