import type { CLIOptions } from './types';
import { CLIOptionsSchema } from './types';

/**
 * Parse CLI arguments from process.argv
 * @param argv - Process arguments (default: process.argv)
 * @returns Parsed CLI options
 */
export function parseCLIOptions(argv: string[] = process.argv): CLIOptions {
  const args = argv.slice(2);

  const options: CLIOptions = {
    fresh: false,
    format: 'text',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--milestone':
      case '-m':
        const milestoneValue = args[++i];
        if (milestoneValue === undefined) {
          throw new Error('--milestone requires a value (1-4)');
        }
        const milestoneNum = parseInt(milestoneValue, 10);
        if (isNaN(milestoneNum) || milestoneNum < 1 || milestoneNum > 4) {
          throw new Error(`Invalid milestone: ${milestoneValue}. Must be 1-4.`);
        }
        options.milestone = milestoneNum;
        break;

      case '--fresh':
      case '-f':
        options.fresh = true;
        break;

      case '--format':
        const formatValue = args[++i];
        if (formatValue === undefined) {
          throw new Error('--format requires a value (text|json|markdown)');
        }
        if (!['text', 'json', 'markdown'].includes(formatValue)) {
          throw new Error(
            `Invalid format: ${formatValue}. Must be text, json, or markdown.`
          );
        }
        options.format = formatValue as 'text' | 'json' | 'markdown';
        break;

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--timeout':
      case '-t':
        const timeoutValue = args[++i];
        if (timeoutValue === undefined) {
          throw new Error('--timeout requires a value (milliseconds)');
        }
        const timeoutNum = parseInt(timeoutValue, 10);
        if (isNaN(timeoutNum) || timeoutNum <= 0) {
          throw new Error(`Invalid timeout: ${timeoutValue}. Must be a positive number.`);
        }
        options.timeout = timeoutNum;
        break;

      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;

      case '--prp':
        const prpPath = args[++i];
        if (prpPath === undefined) {
          throw new Error('--prp requires a file path');
        }
        options.prpPath = prpPath;
        break;

      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}. Use --help for usage information.`);
        }
        // Non-option arguments are ignored (could be positional args in future)
        break;
    }
  }

  // Validate with Zod schema
  return CLIOptionsSchema.parse(options);
}

/**
 * Print help text for the CLI
 */
export function printHelp(): void {
  console.log(`
DOD Verification Tool

USAGE:
  bun run dod:verify [OPTIONS]

OPTIONS:
  -m, --milestone <N>      Verify only specific milestone (1-4)
  -f, --fresh              Force fresh verification, bypass cache
  --format <format>        Output format: text, json, markdown (default: text)
  -v, --verbose            Enable verbose output
  -t, --timeout <ms>       Custom timeout for verifications in milliseconds
  --prp <path>             Path to prp.md file (default: auto-detect)
  -h, --help               Show this help message

EXAMPLES:
  # Verify all milestones
  bun run dod:verify

  # Verify only milestone 2
  bun run dod:verify --milestone 2

  # Force fresh verification
  bun run dod:verify --fresh

  # Get JSON output
  bun run dod:verify --format json

  # Verbose mode
  bun run dod:verify --verbose

EXIT CODES:
  0 - All criteria passed
  1 - One or more criteria failed
  2 - Verification error (parsing, execution, etc.)

For more information, see the documentation.
`);
}
