import { CliError } from "./lib/errors.ts";
import { buildProgram } from "./cli/program.ts";

function shouldUseJsonError(argv: string[]): boolean {
  return argv.includes("--json");
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const program = buildProgram();

  try {
    await program.parseAsync(argv);
  } catch (error) {
    const jsonMode = shouldUseJsonError(argv);
    const cliError = error instanceof CliError ? error : new CliError((error as Error).message || "Unexpected error", 1);

    if (jsonMode) {
      console.log(
        JSON.stringify(
          {
            error: {
              message: cliError.message,
              exitCode: cliError.exitCode,
            },
          },
          null,
          2,
        ),
      );
    } else if (cliError.exitCode !== 0) {
      console.error(cliError.message);
    }

    process.exitCode = cliError.exitCode;
  }
}

if (import.meta.main) {
  await main(process.argv);
}
