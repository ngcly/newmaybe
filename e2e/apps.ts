export function enabled(app: string): boolean {
  return !process.env.TEST_APPS || (JSON.parse(process.env.TEST_APPS) as string[]).includes(app);
}
