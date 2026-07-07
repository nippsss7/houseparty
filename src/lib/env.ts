function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env and fill in your Supabase/Mapbox credentials.`
    );
  }
  return value;
}

export const env = {
  supabaseUrl: requireEnv("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ),
  mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "",
};
