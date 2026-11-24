// Triggers a fresh production build of the site on a schedule by calling a
// Netlify build hook. The hook URL is stored in the BUILD_HOOK_URL environment
// variable (create it under Project configuration → Build & deploy →
// Continuous deployment → Build hooks).
//
// Scheduled functions only run on the published production deploy.

export default async () => {
  const hookUrl = process.env.BUILD_HOOK_URL
  if (!hookUrl) {
    console.error('BUILD_HOOK_URL is not set; skipping scheduled rebuild.')
    return
  }

  const res = await fetch(hookUrl, { method: 'POST', body: '{}' })
  if (!res.ok) {
    console.error(`Build hook request failed: ${res.status} ${res.statusText}`)
    return
  }
  console.log('Scheduled rebuild triggered.')
}

export const config = {
  // Cron syntax, UTC. Every day at 06:00 UTC.
  schedule: '0 12 * * 2',
}
