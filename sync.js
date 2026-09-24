// sync.js — Supabase cloud sync for Speak

const SUPABASE_URL = 'https://ymljgpaublxjazfgcefz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_q5cjUmE-5kcX81NZTwad1Q_VKxotAf5';

// The Supabase SDK is loaded from a CDN. Content filters in schools, hospitals
// and long-term-care facilities — exactly the places Speak is meant to run — block
// CDN origins routinely, and a jsdelivr outage does the same thing. Calling
// createClient() unguarded throws while this file is still parsing, which takes
// window.Sync down with it and silently kills sign-in, cloud sync and the account
// controls with no message to the user. Degrade loudly instead: the on-device app
// keeps working and the UI says why the cloud half is missing.
const _sdkReady = typeof supabase !== 'undefined'
               && typeof supabase.createClient === 'function';

const _sb = _sdkReady ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

window.Sync = {
  // Cached so the safety path can attach a user_id without going async.
  userId: null,

  async getSession() {
    try {
      const { data: { session } } = await _sb.auth.getSession();
      window.Sync.userId = session?.user?.id || null;
      return session;
    } catch { return null; }
  },

  async signUp(email, password) {
    return _sb.auth.signUp({ email, password });
  },

  async signIn(email, password) {
    return _sb.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    await _sb.auth.signOut();
  },

  async resetPassword(email) {
    return _sb.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://speakaac.org/reset-password.html',
    });
  },

  // If they paid with an email that had no account yet, the Stripe webhook
  // parked the tier server-side. Claim it once per session, before reading
  // settings, so the upgrade they paid for is already applied when the app
  // renders. Never blocks sign-in: any failure here is swallowed.
  async _claimParkedUpgrade(session) {
    if (this._claimed) return;
    this._claimed = true;
    try {
      await fetch('/.netlify/functions/claim-upgrade', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    } catch { /* offline or function down — next sign-in retries */ }
  },

  async load() {
    try {
      const session = await this.getSession();
      if (!session) return null;
      await this._claimParkedUpgrade(session);
      const { data } = await _sb
        .from('profiles')
        .select('settings')
        .eq('user_id', session.user.id)
        .single();
      return data?.settings || null;
    } catch { return null; }
  },

  async save(settings) {
    try {
      const session = await this.getSession();
      if (!session) return;
      // Strip tier before saving — tier is set only by Stripe webhook via service role key
      const { tier, ...safeSettings } = settings;
      await _sb.from('profiles').upsert(
        { user_id: session.user.id, settings: safeSettings, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    } catch (e) { console.warn('Sync save failed:', e); }
  },

  async setTeacherEmail(email) {
    try {
      const session = await this.getSession();
      if (!session) return;
      await _sb.from('profiles').upsert(
        { user_id: session.user.id, teacher_email: email || null, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    } catch (e) { console.warn('Teacher email update failed:', e); }
  },

  async loadAsTeacher() {
    try {
      const session = await this.getSession();
      if (!session) return [];
      const { data } = await _sb
        .from('profiles')
        .select('user_id, settings, teacher_email')
        .eq('teacher_email', session.user.email);
      return data || [];
    } catch { return []; }
  },

  async loadEventsForProfile(profileUserId, limit = 200) {
    try {
      const { data } = await _sb
        .from('events')
        .select('*')
        .eq('user_id', profileUserId)
        .order('ts', { ascending: false })
        .limit(limit);
      return data || [];
    } catch { return []; }
  },

  async saveEvent(event) {
    try {
      const session = await this.getSession();
      if (!session) return;
      await _sb.from('events').insert({
        user_id:  session.user.id,
        type:     event.type,
        payload:  event.payload,
        ts:       event.ts,
        date_str: event.dateStr,
        time_str: event.timeStr,
      });
    } catch (e) { console.warn('Event sync failed:', e); }
  },

  // Institution-side incident read. Goes through a function that verifies the
  // caller is the assigned teacher for the profiles it returns — the device
  // account never is, so this stays closed to the caretaker.
  async loadIncidentsAsTeacher() {
    try {
      const session = await this.getSession();
      if (!session) return [];
      const res = await fetch('/.netlify/functions/get-safety-incidents', {
        method:  'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return [];
      return (await res.json()).incidents || [];
    } catch { return []; }
  },

  // ── Safety incidents are deliberately NOT accessible from the client ──
  //
  // The device account belongs to the caretaker. If the caretaker is the
  // person the user is reporting, any client-side read or write of this
  // table hands them the report. Writes go through
  // netlify/functions/send-safety-alert.js using the service role key;
  // reads are institution-side only.
  //
  // See supabase_safety_incidents_lockdown.sql — RLS now blocks both.
};

// ── Degraded mode ───────────────────────────────────────────────────────────
// Same method names, same return shapes, no network. Callers that do
// `const { error } = await Sync.signIn(...)` get a real message to show rather
// than a TypeError on a null client.
if (!_sdkReady) {
  console.error(
    '[Speak] Supabase SDK failed to load (cdn.jsdelivr.net unreachable). ' +
    'Cloud sync, sign-in and account controls are disabled. ' +
    'On-device use is unaffected.'
  );

  window.Sync.UNAVAILABLE_MESSAGE =
    'Cannot reach the server. A network filter may be blocking cdn.jsdelivr.net. ' +
    'Speak still works on this device.';

  const _down = () => ({
    data:  null,
    error: { name: 'SyncUnavailable', message: window.Sync.UNAVAILABLE_MESSAGE },
  });

  Object.assign(window.Sync, {
    unavailable: true,
    userId: null,
    async getSession()            { return null;    },
    async signUp()                { return _down(); },
    async signIn()                { return _down(); },
    async signOut()               {                 },
    async resetPassword()         { return _down(); },
    async load()                  { return null;    },
    async save()                  {                 },
    async setTeacherEmail()       {                 },
    async loadAsTeacher()         { return [];      },
    async loadEventsForProfile()  { return [];      },
    async saveEvent()             {                 },
    async loadIncidentsAsTeacher(){ return [];      },
  });

  window.dispatchEvent(new CustomEvent('speak:sync-unavailable'));
}
