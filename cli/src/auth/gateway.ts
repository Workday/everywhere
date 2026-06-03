export function parseGatewayUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error(`Invalid gateway URL: ${input}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Invalid gateway URL scheme: ${parsed.protocol}`);
  }

  if (!parsed.hostname) {
    throw new Error(`Invalid gateway URL: missing hostname`);
  }

  return parsed.origin;
}
