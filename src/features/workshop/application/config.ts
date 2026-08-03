const env = import.meta.env

export const workshopConfig = {
  supabaseUrl: env.VITE_SUPABASE_URL?.trim() || '',
  publishableKey: env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '',
}

export function isWorkshopConfigured() {
  return Boolean(workshopConfig.supabaseUrl && workshopConfig.publishableKey)
}

export function workshopWebRedirectUrl(locationHref = window.location.href) {
  const base = new URL('.', locationHref)
  base.hash = ''
  base.search = ''
  base.searchParams.set('workshopAuth', 'github')
  return base.toString()
}
