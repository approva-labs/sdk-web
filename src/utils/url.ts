export function appendQuery(
  url: string,
  params: Record<string, string | undefined>
): string {
  const target = new URL(url);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      target.searchParams.set(key, value);
    }
  }

  return target.toString();
}
