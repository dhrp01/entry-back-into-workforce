/* Return to Work: single-page front end. No build step, no dependencies.
   The profile lives in localStorage and is sent to the server with each request. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- utils ---
  const $ = (sel, el) => (el || document).querySelector(sel);
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Links come from job boards and (optionally) a model: only ever render http(s).
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || '')) ? esc(u) : '#');
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('rtw.' + key); return v == null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem('rtw.' + key, JSON.stringify(value)); } catch (e) { /* private mode */ } },
    clear() { try { Object.keys(localStorage).filter((k) => k.startsWith('rtw.')).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ } },
  };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthLabel = (ym) => { const m = /^(\d{4})-(\d{2})/.exec(ym || ''); return m ? MONTHS[+m[2] - 1] + ' ' + m[1] : ''; };

  let toastTimer;
  function toast(text) {
    const el = $('#toast');
    el.textContent = text; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Copied'); }
    catch (e) { toast('Select the text and copy it manually'); }
  }
  async function post(path, body) {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'The server could not complete that.');
    return data;
  }

  // ---------------------------------------------------------------- state ---
  const app = $('#app');
  const state = {
    config: null,
    profile: store.get('profile', {}),
    done: store.get('done', false),
    step: store.get('step', 0),
    cache: store.get('cache', {}),
    ticks: store.get('ticks', {}),
    resumeText: store.get('resume', ''),
    jobs: null,
    remoteOnly: false,
  };
  // The questionnaire gained new questions; restart its position for existing
  // profiles so an old saved step cannot skip them. Keep all saved answers.
  if (store.get('quizVersion', 0) < 1) {
    state.step = 0;
    store.set('step', 0);
    store.set('quizVersion', 1);
  }
  const saveProfile = () => store.set('profile', state.profile);

  async function cached(key, path, body) {
    if (state.cache[key]) return state.cache[key];
    const data = await post(path, body);
    state.cache[key] = data; store.set('cache', state.cache);
    return data;
  }

  // ------------------------------------------------------------ questions ---
  const SECTIONS = ["Where you've been", 'Your time away', 'Where you want to go', 'Practicalities', 'How you feel'];
  function questions() {
    const c = state.config;
    const field = c.fields.find((f) => f.key === state.profile.field);
    return [
      { id: 'name', section: 0, type: 'text', optional: true, q: 'First, what should we call you?', hint: 'Optional. A first name is plenty.', placeholder: 'Your first name' },
      { id: 'lastRole', section: 0, type: 'text', q: 'What was your most recent role?', hint: 'The job title you held before you stepped away.', placeholder: 'For example, Marketing manager' },
      { id: 'field', section: 0, type: 'single', cols: true, q: 'Which field was that in?', options: c.fields.map((f) => [f.key, f.label]) },
      { id: 'awayDate', section: 0, type: 'month', past: true, q: 'When did you step away from work?', hint: 'A rough month is fine. It lets us show you exactly what has changed since.' },
      { id: 'strengths', section: 0, type: 'text', q: 'Which skills and tools are you most confident in?', hint: 'List your strongest skills and tools, separated by commas.', placeholder: 'For example, project planning, Excel, writing' },
      { id: 'education', section: 0, type: 'text', q: 'Tell us about your education.', hint: 'Include any qualifications, training or education you would like to share.', placeholder: 'For example, BA in Business or a technical certificate' },
      { id: 'loved', section: 0, type: 'textarea', optional: true, q: 'What did you enjoy most about that work?', hint: 'Optional. This helps point you at roles you will want to stay in.' },

      { id: 'breakReasons', section: 1, type: 'multi', cols: true, q: 'What filled your time while you were away?', hint: 'Choose all that apply.', options: c.breakReasons.map((r) => [r.key, r.label]) },
      { id: 'breakSkills', section: 1, type: 'multi', q: 'Which of these did you do regularly?', hint: 'Choose all that apply. Every one of these is a skill employers pay for.', options: c.breakSkills.map((s) => [s.key, s.label]) },
      { id: 'proud', section: 1, type: 'textarea', optional: true, q: 'Is there anything from this time you are proud of?', hint: 'Optional. Something you learned, built, organised or got someone through.' },

      { id: 'direction', section: 2, type: 'single', q: 'Where do you want to go next?', options: [['same', 'Back to the same kind of work'], ['adjacent', 'Something close to it'], ['new', 'Something new'], ['unsure', 'I am not sure yet']] },
      { id: 'targetRole', section: 2, type: 'text', q: 'Which role would you like to aim for?', hint: 'Type a job title, or pick a suggestion. You can change it later.', placeholder: 'For example, Project manager', suggest: field ? field.roles : [] },
      { id: 'priorities', section: 2, type: 'multi', max: 3, cols: true, q: 'What matters most to you now?', hint: 'Choose up to three.', options: [['flexibility', 'Flexibility'], ['pay', 'Pay'], ['growth', 'Learning and growth'], ['purpose', 'Meaningful work'], ['stability', 'Stability'], ['team', 'A supportive team']] },

      { id: 'schedule', section: 3, type: 'single', q: 'What kind of hours are you looking for?', options: [['full-time', 'Full-time'], ['part-time', 'Part-time'], ['phased', 'Start part-time and build up'], ['unsure', 'Open to either']] },
      { id: 'workStyle', section: 3, type: 'single', q: 'Where would you like to work?', options: [['remote', 'From home'], ['hybrid', 'A mix of home and office'], ['onsite', 'On site'], ['any', 'No strong preference']] },
      { id: 'location', section: 3, type: 'text', optional: true, q: 'Where are you based?', hint: 'Optional. A city or country helps rank nearby jobs higher.', placeholder: 'City or country' },
      { id: 'startDate', section: 3, type: 'month', q: 'When would you like to be back at work?', hint: 'A target, not a deadline. Your plan is paced to this.' },
      { id: 'hoursPerWeek', section: 3, type: 'single', q: 'How much time can you give to preparing each week?', options: [['2', 'About 2 hours'], ['5', 'About 5 hours'], ['10', 'About 10 hours'], ['15', '15 hours or more']] },

      { id: 'improvement', section: 4, type: 'textarea', q: 'Where would you like to improve most?', hint: 'Think about skills, tools, confidence or anything else you want to work on.' },
      { id: 'confidence', section: 4, type: 'scale', q: 'How ready do you feel today?', hint: 'There is no wrong answer. This is your starting line, and it will move.' },
      { id: 'worries', section: 4, type: 'multi', optional: true, q: 'What worries you most about going back?', hint: 'Choose any that apply. Each one has a step in your plan.', options: c.worries.map((w) => [w.key, w.label]) },
    ];
  }
  function steps() {
    const qs = questions(); const out = [];
    qs.forEach((q, i) => {
      out.push({ kind: 'q', q });
      if (!qs[i + 1] || qs[i + 1].section !== q.section) out.push({ kind: 'cheer', section: q.section });
    });
    return out;
  }
  const answered = (q) => {
    const v = state.profile[q.id];
    return Array.isArray(v) ? v.length > 0 : String(v == null ? '' : v).trim() !== '';
  };

  function cheer(section) {
    const p = state.profile; const c = state.config;
    if (section === 0) {
      const n = String(p.strengths || '').split(/[,;\n]/).filter((s) => s.trim()).length;
      return { title: 'That experience is still yours.', body: `<p>Your time as ${esc(/^[aeiou]/i.test(p.lastRole || '') ? 'an' : 'a')} <strong>${esc(p.lastRole || 'professional')}</strong> does not expire. ${n ? `You named ${n} strength${n === 1 ? '' : 's'}, and ${n === 1 ? 'it goes' : 'they go'} straight into your summary.` : ''}</p><p class="muted">Next: the time you were away. It counts for more than most people think.</p>` };
    }
    if (section === 1) {
      const rows = (p.breakSkills || []).map((k) => c.breakSkills.find((s) => s.key === k)).filter(Boolean);
      return { title: rows.length ? 'You were working the whole time.' : 'Time away builds judgement.', body: rows.length
        ? `<p>Here is how what you did reads to an employer.</p><table class="translate"><thead><tr><th>What you did</th><th>What it shows</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.label)}</td><td>${esc(r.skill)}</td></tr>`).join('')}</tbody></table>`
        : '<p>Patience, perspective and priorities are hard to teach. You will bring all three back with you.</p>' };
    }
    if (section === 2) {
      return { title: 'Now there is a target.', body: `<p>Everything from here is shaped around <strong>${esc(p.targetRole || 'your next role')}</strong>: your plan, your courses, your resume edits and the jobs we show you.</p><p class="muted">Two short sections left.</p>` };
    }
    if (section === 3) {
      const m = /^(\d{4})-(\d{2})/.exec(p.startDate || '');
      let weeks = 8;
      if (m) weeks = Math.max(4, Math.min(12, Math.floor((new Date(+m[1], +m[2] - 1, 1) - new Date()) / 6048e5)));
      const hours = weeks * (+p.hoursPerWeek || 5);
      return { title: `That gives you about ${hours} hours.`, body: `<p>${weeks} weeks at ${esc(p.hoursPerWeek || 5)} hours a week is enough to finish a short certificate, rebuild your resume and send your first applications. Your plan spreads it out so no week feels heavy.</p><p class="muted">Last section: a few quick questions.</p>` };
    }
    return { title: 'That is everything we need.', body: '<p>You have just done the hardest part, which is starting. Your summary, plan and first three steps are ready.</p>', final: true };
  }

  // ------------------------------------------------------------- the quiz ---
  function monthSelect(q) {
    const value = /^(\d{4})-(\d{2})/.exec(state.profile[q.id] || '');
    const now = new Date().getFullYear();
    const years = [];
    if (q.past) for (let y = now; y >= now - 35; y--) years.push(y); else for (let y = now; y <= now + 2; y++) years.push(y);
    return `<div class="row"><select class="field" id="q-month" aria-label="Month" style="flex:1;min-width:150px"><option value="">Month</option>${MONTHS.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}"${value && +value[2] === i + 1 ? ' selected' : ''}>${m}</option>`).join('')}</select>
      <select class="field" id="q-year" aria-label="Year" style="flex:1;min-width:120px"><option value="">Year</option>${years.map((y) => `<option${value && +value[1] === y ? ' selected' : ''}>${y}</option>`).join('')}</select></div>`;
  }

  function renderQuiz() {
    const all = steps();
    state.step = Math.max(0, Math.min(state.step, all.length - 1));
    store.set('step', state.step);
    const cur = all[state.step];
    const pct = Math.round((state.step / (all.length - 1)) * 100);
    const section = cur.kind === 'q' ? cur.q.section : cur.section;
    let body;

    if (cur.kind === 'cheer') {
      const ch = cheer(cur.section);
      body = `<div class="cheer"><div class="card stack"><p class="eyebrow">Section ${cur.section + 1} of ${SECTIONS.length} complete</p><h1>${esc(ch.title)}</h1>${ch.body}</div>
        <div class="quiz-actions"><button class="btn ghost" id="back" type="button">Back</button><button class="btn" id="next" type="button">${ch.final ? 'See my summary' : 'Continue'}</button></div></div>`;
    } else {
      const q = cur.q; const v = state.profile[q.id];
      let input = '';
      if (q.type === 'text') input = `<input class="field" id="q-input" type="text" autocomplete="off" maxlength="120" placeholder="${esc(q.placeholder || '')}" value="${esc(v || '')}">` + (q.suggest && q.suggest.length ? `<div class="suggest chips">${q.suggest.map((s) => `<button type="button" data-suggest="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '');
      if (q.type === 'textarea') input = `<textarea class="field" id="q-input" maxlength="600">${esc(v || '')}</textarea>`;
      if (q.type === 'month') input = monthSelect(q);
      if (q.type === 'single' || q.type === 'multi') {
        const chosen = q.type === 'multi' ? (v || []) : [v];
        input = `<div class="options${q.cols ? ' cols' : ''}" role="group">${q.options.map(([key, label]) => `<button type="button" class="opt ${q.type}" data-opt="${esc(key)}" aria-pressed="${chosen.includes(key)}"><span class="mark" aria-hidden="true"></span>${esc(label)}</button>`).join('')}</div>`;
      }
      if (q.type === 'scale') input = `<div class="scale" role="group" aria-label="Readiness from 1 to 10">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button type="button" data-scale="${n}" aria-pressed="${+v === n}">${n}</button>`).join('')}</div><div class="scale-ends"><span>Not at all</span><span>Completely</span></div>`;

      body = `<div class="q"><p class="eyebrow">${esc(SECTIONS[q.section])}</p><h1 id="q-title">${esc(q.q)}</h1><p class="hint">${esc(q.hint || '')}</p>${input}
        <div class="quiz-actions"><button class="btn ghost" id="back" type="button"${state.step === 0 ? ' disabled' : ''}>Back</button>
        <span class="row">${q.optional ? '<button class="link" id="skip" type="button">Skip</button>' : ''}<button class="btn" id="next" type="button"${q.optional || answered(q) ? '' : ' disabled'}>Continue</button></span></div></div>`;
    }

    app.innerHTML = `<div class="quiz"><div class="quiz-meta"><span>${esc(SECTIONS[section])}</span><span>${pct}%</span></div>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Questionnaire progress"><i style="width:${pct}%"></i></div>${body}</div>`;

    const go = (delta) => {
      if (delta > 0 && state.step === all.length - 1) return finishQuiz();
      state.step += delta; renderQuiz();
    };
    $('#back').onclick = () => go(-1);
    $('#next').onclick = () => go(1);
    if ($('#skip')) $('#skip').onclick = () => go(1);
    if (cur.kind !== 'q') { $('#next').focus(); return; }

    const q = cur.q; const next = $('#next');
    const refresh = () => { saveProfile(); next.disabled = !(q.optional || answered(q)); };
    const input = $('#q-input');
    if (input) {
      input.oninput = () => { state.profile[q.id] = input.value; refresh(); };
      input.onkeydown = (e) => { if (e.key === 'Enter' && q.type === 'text' && !next.disabled) { e.preventDefault(); go(1); } };
      input.focus(); if (input.setSelectionRange) input.setSelectionRange(input.value.length, input.value.length);
    }
    $$('[data-suggest]').forEach((b) => { b.onclick = () => { input.value = b.dataset.suggest; state.profile[q.id] = input.value; refresh(); input.focus(); }; });
    if (q.type === 'month') {
      const sync = () => { const m = $('#q-month').value; const y = $('#q-year').value; state.profile[q.id] = m && y ? `${y}-${m}` : ''; refresh(); };
      $('#q-month').onchange = sync; $('#q-year').onchange = sync;
    }
    $$('[data-opt]').forEach((b) => {
      b.onclick = () => {
        const key = b.dataset.opt;
        if (q.type === 'single') {
          state.profile[q.id] = key;
          if (q.id === 'field') delete state.profile.targetRole;   // suggestions depend on the field
          saveProfile(); go(1); return;
        }
        const list = (state.profile[q.id] || []).slice();
        const i = list.indexOf(key);
        if (i >= 0) list.splice(i, 1);
        else if (q.max && list.length >= q.max) { toast(`Choose up to ${q.max}`); return; }
        else list.push(key);
        state.profile[q.id] = list; refresh();
        b.setAttribute('aria-pressed', String(i < 0));
      };
    });
    $$('[data-scale]').forEach((b) => { b.onclick = () => { state.profile[q.id] = +b.dataset.scale; refresh(); $$('[data-scale]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }; });
  }

  function finishQuiz() {
    state.done = true; store.set('done', true);
    state.cache = {}; store.set('cache', {});     // answers changed: rebuild everything
    state.jobs = null;
    location.hash = '#/summary';
  }

  // ---------------------------------------------------------------- views ---
  const STEPS = [['summary', 'Summary'], ['roadmap', 'Roadmap'], ['refresher', 'What changed'], ['courses', 'Courses'], ['resume', 'Resume'], ['jobs', 'Jobs']];
  const head = (eyebrow, title, lede) => `<div class="head"><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p class="lede">${lede}</p></div>`;
  const loading = (text) => `<div class="loading"><span class="spinner"></span><span>${esc(text)}</span></div>`;
  const failed = (err) => `<div class="note warm"><strong>That did not load.</strong> ${esc(err.message || err)} <button class="link" type="button" onclick="location.reload()">Try again</button></div>`;
  const nextStep = (key, label) => `<div class="row" style="margin-top:32px"><a class="btn" href="#/${key}">Next: ${esc(label)}</a></div>`;

  function viewWelcome() {
    const resume = !state.done && Object.keys(state.profile).length > 0;
    app.innerHTML = `<section class="hero">
      <p class="eyebrow">For anyone returning after a career break</p>
      <h1>Going back to work starts with <em>what you already have.</em></h1>
      <p class="lede">Answer a few questions and get a personal plan: what changed while you were away, what to learn, how to fix your resume, and live jobs worth applying to.</p>
      <div class="row" style="margin-top:28px">
        <a class="btn" href="#/quiz">${state.done ? 'Edit my answers' : resume ? 'Continue where I left off' : 'Start: it takes 5 minutes'}</a>
        ${state.done ? '<a class="btn ghost" href="#/summary">Go to my summary</a>' : ''}
      </div>
      <ol class="steps-preview">
        <li><strong>A short questionnaire</strong><span class="muted small">About your strengths first, gaps second.</span></li>
        <li><strong>Your roadmap</strong><span class="muted small">A week-by-week plan with training built in.</span></li>
        <li><strong>What changed</strong><span class="muted small">A refresher on your field since you left.</span></li>
        <li><strong>Courses</strong><span class="muted small">Matched to your role, time and budget.</span></li>
        <li><strong>Resume edits</strong><span class="muted small">Specific changes, including how to present the gap.</span></li>
        <li><strong>Live jobs and recruiters</strong><span class="muted small">Current postings ranked for you, with who to contact.</span></li>
      </ol></section>`;
  }

  async function viewSummary() {
    app.innerHTML = loading('Putting your summary together');
    const s = await cached('summary', '/api/summary', { profile: state.profile });
    const labels = { 'full-time': 'Full-time', 'part-time': 'Part-time', phased: 'Phased start', unsure: 'Flexible on hours', remote: 'From home', hybrid: 'Hybrid', onsite: 'On site', any: 'Any location' };
    const pri = { flexibility: 'Flexibility', pay: 'Pay', growth: 'Learning and growth', purpose: 'Meaningful work', stability: 'Stability', team: 'A supportive team' };
    const t = s.target;
    app.innerHTML = head('Your summary', s.headline.charAt(0).toUpperCase() + s.headline.slice(1), esc(s.awayNote)) + `
      <div class="grid two">
        <div class="card stack"><h2>Your strengths</h2>
          <div class="chips">${s.strengths.map((x) => `<span class="chip${x.from === 'break' ? ' gold' : ''}">${esc(x.text)}</span>`).join('') || '<span class="muted">Add a few in the questionnaire and they will appear here.</span>'}</div>
          ${s.strengths.some((x) => x.from === 'break') ? '<p class="small muted">Highlighted strengths come from your time away. They belong on your resume too.</p>' : ''}</div>
        <div class="card stack"><h2>Your target</h2><p style="font-size:1.25rem;font-weight:600">${esc(t.role)}</p>
          <div class="chips">${[labels[t.schedule], labels[t.workStyle], t.location].filter(Boolean).map((x) => `<span class="chip plain">${esc(x)}</span>`).join('')}</div>
          ${t.priorities.length ? `<p class="small muted">What matters most: ${t.priorities.map((k) => esc(pri[k] || k)).join(', ')}.</p>` : ''}</div>
        <div class="card stack"><h2>Your starting line</h2>
          <div><div class="meter" aria-label="Readiness ${s.confidence} out of 10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < s.confidence ? 'on' : ''}"></i>`).join('')}</div><p class="small muted">${s.confidence} out of 10 today</p></div>
          <p>${esc(s.confidenceNote)}</p>
          <p class="small muted">You have about ${s.prepHours} hours of preparation over ${s.weeks} weeks.</p></div>
        <div class="card stack"><h2>What is on your mind</h2>${s.worries.map((w) => `<div class="worry"><strong>${esc(w.label)}</strong><p class="muted">${esc(w.reply)} <a href="#/${esc(w.step)}">Go there</a></p></div>`).join('') || '<p class="muted">Nothing flagged. If something comes up, each step has help built in.</p>'}</div>
      </div>
      <div class="card stack" style="margin-top:16px"><div class="row spread"><h2>Your gap, in one sentence</h2><button class="btn ghost small" id="copy-gap" type="button">Copy</button></div>
        <p class="quote">${esc(s.gapLine)}</p><p class="small muted">Use this on your resume and LinkedIn, and as the start of your answer in interviews.</p></div>
      <h2 style="margin:34px 0 14px">Your first three steps</h2>
      <div class="next">${s.firstSteps.map((f) => `<a href="#/${esc(f.step)}">${esc(f.text)}</a>`).join('')}</div>
      <p class="small muted" style="margin-top:24px"><a href="#/quiz">Edit my answers</a></p>`;
    $('#copy-gap').onclick = () => copy(s.gapLine);
  }

  async function viewRoadmap() {
    app.innerHTML = head('Your roadmap', 'One week at a time.', 'Three small tasks a week: one to learn, one for your career, one for your confidence.') + loading('Building your plan');
    const r = await cached('roadmap', '/api/roadmap', { profile: state.profile });
    const draw = () => {
      const total = r.weeks.length * 3;
      const done = r.weeks.reduce((n, w) => n + w.tasks.filter((_, i) => state.ticks[`${w.week}-${i}`]).length, 0);
      const current = r.weeks.find((w) => w.tasks.some((_, i) => !state.ticks[`${w.week}-${i}`]));
      let html = head('Your roadmap', 'One week at a time.', `${r.totalWeeks} weeks at about ${r.hoursPerWeek} hours a week. Three small tasks each week: one to learn, one for your career, one for your confidence.`) +
        `<div class="card"><div class="row spread"><strong>${done === 0 ? 'Tick your first task to get going' : done === total ? 'Plan complete. You are ready.' : `${done} of ${total} tasks done`}</strong><span class="muted small">${current ? `You are on week ${current.week}` : ''}</span></div><div class="bar" style="margin-top:12px"><i style="width:${Math.round((done / total) * 100)}%"></i></div></div>`;
      let phase = '';
      r.weeks.forEach((w) => {
        if (w.phase !== phase) { html += `${phase ? '</section>' : ''}<section class="phase"><h2>${esc(w.phase)}</h2><p class="muted">${esc(w.phaseNote)}</p>`; phase = w.phase; }
        const weekDone = w.tasks.every((_, i) => state.ticks[`${w.week}-${i}`]);
        html += `<div class="card week${weekDone ? ' done' : ''}"><div class="row spread"><h3>Week ${w.week}</h3>${weekDone ? '<span class="chip">Done</span>' : `<span class="muted small">from ${new Date(w.starts + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>`}</div>` +
          w.tasks.map((t, i) => {
            const id = `${w.week}-${i}`; const on = !!state.ticks[id];
            const link = t.url ? ` <a href="${safeUrl(t.url)}" target="_blank" rel="noopener noreferrer">Open course</a>` : t.step ? ` <a href="#/${esc(t.step)}">Open</a>` : '';
            return `<label class="task${on ? ' checked' : ''}"><input type="checkbox" data-tick="${id}"${on ? ' checked' : ''}><span><span class="task-kind">${esc(t.kind)}</span><span class="task-text">${esc(t.text)}</span>${link}</span><span class="muted small">${t.hours} h</span></label>`;
          }).join('') + '</div>';
      });
      app.innerHTML = html + '</section>' + nextStep('refresher', 'What changed');
      $$('[data-tick]').forEach((box) => {
        box.onchange = () => {
          state.ticks[box.dataset.tick] = box.checked; store.set('ticks', state.ticks);
          const y = window.scrollY; draw(); window.scrollTo(0, y);
          if (box.checked) toast('Nice. One step closer.');
        };
      });
    };
    draw();
  }

  async function viewRefresher() {
    const since = monthLabel(state.profile.awayDate);
    const intro = head('What changed', since ? `Since ${since}` : 'While you were away', 'Less than it feels like. Here is what moved, and one thing to do about each.');
    app.innerHTML = intro + loading(state.config.ai ? 'Searching for what has changed in your field. This can take a minute.' : 'Gathering what changed');
    const r = await cached('refresher', '/api/refresher', { profile: state.profile });
    let html = intro + `<div class="row" style="margin-bottom:8px"><span class="chip plain">${esc(r.field)}</span><span class="chip ${r.mode === 'live' ? '' : 'gold'}">${r.mode === 'live' ? 'Live digest with sources' : 'Starter digest'}</span><span class="muted small">${r.items.length} changes</span></div>`;
    if (r.mode !== 'live') html += '<p class="small muted">This is a curated starting list. Add an Anthropic API key to get a live, cited digest for your exact role (see the README).</p>';
    html += '<div class="timeline">';
    let year = '';
    r.items.forEach((item) => {
      const y = (item.date || '').slice(0, 4);
      if (y && y !== year) { html += `<div class="tl-year">${esc(y)}</div>`; year = y; }
      html += `<div class="card tl-item"><div class="row spread"><h3>${esc(item.title)}</h3><span class="chip plain small">${esc(item.scope)}</span></div><p style="margin-top:8px">${esc(item.body)}</p>
        ${item.action ? `<p class="note do"><strong>Do this:</strong> ${esc(item.action)}</p>` : ''}
        ${item.source ? `<p class="small" style="margin-top:10px"><a href="${safeUrl(item.source)}" target="_blank" rel="noopener noreferrer">Source</a></p>` : ''}</div>`;
    });
    html += '</div>';
    if (r.sources && r.sources.length) html += `<details style="margin-top:24px"><summary>All sources consulted (${r.sources.length})</summary><ul class="small">${r.sources.map((s) => `<li><a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`).join('')}</ul></details>`;
    app.innerHTML = html + nextStep('courses', 'Courses');
  }

  async function viewCourses() {
    const intro = head('Courses', 'Learn what closes the gap.', 'Chosen for your target role and the time you have. Start with one. Finishing it matters more than which one.');
    app.innerHTML = intro + loading('Matching courses');
    const { courses } = await cached('courses', '/api/courses', { profile: state.profile });
    app.innerHTML = intro + courses.map((c, i) => `<div class="card course"><div class="item-head"><div><h3>${esc(c.title)}</h3><p class="muted small">${esc(c.provider)}</p></div>${i === 0 ? '<span class="chip warm">Start here</span>' : ''}</div>
      <p style="margin-top:10px">${esc(c.why)}</p>
      <div class="row" style="margin-top:14px"><span class="chip ${c.cost === 'Free' ? '' : 'plain'}">${esc(c.cost)}</span><span class="chip plain">About ${c.hours} hours</span>${c.fieldMatch ? '<span class="chip plain">For your field</span>' : ''}${c.fits ? '<span class="chip plain">Fits your timeline</span>' : '<span class="chip gold">Longer than your plan: start now, finish after</span>'}
      <a class="btn small" style="margin-left:auto" href="${safeUrl(c.url)}" target="_blank" rel="noopener noreferrer">View course</a></div></div>`).join('') +
      '<p class="small muted" style="margin-top:18px">Links open the provider\'s own site. "Free to audit" means the lessons are free and the certificate is paid.</p>' + nextStep('resume', 'Resume');
  }

  function viewResume() {
    const intro = head('Resume', 'Small edits, big difference.', `Paste your resume as it is today. You will get specific changes for a ${esc(state.profile.targetRole || 'new')} role, including how to present your break.`);
    app.innerHTML = intro + `<div class="card stack"><label for="resume-text"><strong>Your resume text</strong></label>
      <textarea class="field" id="resume-text" style="min-height:220px;font-size:.95rem" placeholder="Paste the text of your resume here">${esc(state.resumeText)}</textarea>
      <div class="row spread"><label class="small muted">Or load a text file <input type="file" id="resume-file" accept=".txt,.md,text/plain"></label><button class="btn" id="analyse" type="button">Review my resume</button></div>
      <p class="small muted">${state.config.ai ? 'Your resume is sent to Claude for review and is not stored by this app.' : 'Your resume is checked on this computer by the app and is not stored.'}</p></div><div id="resume-out" style="margin-top:22px"></div>`;
    const area = $('#resume-text'); const out = $('#resume-out');
    area.oninput = () => { state.resumeText = area.value; store.set('resume', area.value); };
    $('#resume-file').onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      if (file.size > 300000) { toast('That file is too large. Paste the text instead.'); return; }
      file.text().then((t) => { area.value = t; area.oninput(); });
    };
    const draw = (r) => {
      const order = { high: 'Do first', medium: 'Worth doing', low: 'Nice to have' };
      out.innerHTML = `<div class="grid two"><div class="card score"><div class="ring" style="--v:${r.score}"><span>${r.score}</span></div><div><h2>Ready-to-send score</h2><p class="muted small">${r.score >= 80 ? 'Nearly there. A few finishing touches.' : r.score >= 55 ? 'A solid base. The edits below will lift it quickly.' : 'A good starting draft. Work through the first few edits and check again.'}</p><p class="small muted" style="margin-top:6px">${r.mode === 'live' ? 'Reviewed by Claude' : 'Automated check'}</p></div></div>
        <div class="card stack"><h2>Keywords for ${esc(r.targetRole)}</h2>${r.present.length ? `<div class="chips">${r.present.map((k) => `<span class="chip">${esc(k)}</span>`).join('')}</div>` : ''}${r.missing.length ? `<p class="small muted">Not found yet. Add the ones that are true for you:</p><div class="chips">${r.missing.slice(0, 12).map((k) => `<span class="chip plain">${esc(k)}</span>`).join('')}</div>` : '<p class="muted small">Good coverage.</p>'}</div></div>
        ${r.strong && r.strong.length ? `<div class="note" style="margin-top:16px"><strong>Already working:</strong> ${r.strong.map(esc).join(' · ')}</div>` : ''}
        <div class="card stack" style="margin-top:16px"><div class="row spread"><h2>A summary for the top of the page</h2><button class="btn ghost small" data-copy="${esc(r.summary)}" type="button">Copy</button></div><p class="quote">${esc(r.summary)}</p>
          <div class="row spread"><h2>Your career break entry</h2><button class="btn ghost small" data-copy="${esc(r.gapLine)}" type="button">Copy</button></div><p class="quote">${esc(r.gapLine)}</p></div>
        <h2 style="margin:30px 0 14px">${r.edits.length} suggested edit${r.edits.length === 1 ? '' : 's'}</h2>` +
        r.edits.map((e) => `<div class="card edit ${esc(e.severity)}"><div class="row spread"><h3>${esc(e.title)}</h3><span class="chip plain small">${order[e.severity] || ''}</span></div><p class="muted" style="margin-top:6px">${esc(e.detail)}</p>
          ${e.before || e.after ? `<div class="diff">${e.before ? `<div class="before"><b>Now</b>${esc(e.before)}</div>` : ''}${e.after ? `<div class="after"><b>Suggested</b>${esc(e.after)} <button class="link small" data-copy="${esc(e.after)}" type="button">Copy</button></div>` : ''}</div>` : ''}</div>`).join('') + nextStep('jobs', 'Jobs');
      $$('[data-copy]', out).forEach((b) => { b.onclick = () => copy(b.dataset.copy); });
    };
    const run = async () => {
      if (area.value.trim().length < 40) { toast('Paste your resume text first'); area.focus(); return; }
      const btn = $('#analyse'); btn.disabled = true;
      out.innerHTML = loading(state.config.ai ? 'Reading your resume. This can take a minute.' : 'Checking your resume');
      try { const r = await post('/api/resume', { profile: state.profile, resume: area.value }); state.cache.resume = r; store.set('cache', state.cache); draw(r); }
      catch (err) { out.innerHTML = failed(err); }
      btn.disabled = false;
    };
    $('#analyse').onclick = run;
    if (state.cache.resume) draw(state.cache.resume);
  }

  function outreach(job) {
    const p = state.profile;
    const strengths = String(p.strengths || '').split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 2).join(' and ');
    return `Hello,\n\nI have applied for the ${job.title} role at ${job.company}. I am ${/^[aeiou]/i.test(p.lastRole || '') ? 'an' : 'a'} ${p.lastRole || 'professional'} returning to work after a planned career break${strengths ? `, with a background in ${strengths}` : ''}, and I have recently refreshed my skills.\n\nWould you be open to a short conversation about the role and what the team is looking for?\n\nThank you,\n${p.name || ''}`.trim();
  }

  function viewJobs() {
    const role = state.profile.targetRole || state.profile.lastRole || 'your target role';
    const intro = head('Jobs', 'Live roles worth your time.', `Current postings, ranked for ${esc(role)} and the way you want to work. Each one comes with a way to find its recruiters.`);
    const draw = () => {
      const j = state.jobs;
      if (!j) {
        app.innerHTML = intro + `<div class="card stack"><p>We check public job boards now, so every result is a posting that is open today.</p><div class="row"><button class="btn" id="find" type="button">Find live jobs</button></div></div>`;
        $('#find').onclick = fetchJobs; return;
      }
      const list = j.jobs.filter((x) => !state.remoteOnly || x.remote);
      const ok = j.sources.filter((s) => s.ok).map((s) => s.name);
      const bad = j.sources.filter((s) => !s.ok).map((s) => s.name);
      let html = intro + `<div class="row spread" style="margin-bottom:16px"><span class="muted small">${j.scanned} postings checked from ${esc(ok.join(', ') || 'no sources')} at ${esc(j.fetchedAt.slice(11))}. ${list.length} match${list.length === 1 ? 'es' : ''} you.${bad.length ? ` ${esc(bad.join(', '))} did not respond.` : ''}</span>
        <span class="row"><label class="small"><input type="checkbox" id="remote-only"${state.remoteOnly ? ' checked' : ''}> Remote only</label><button class="btn ghost small" id="find" type="button">Refresh</button></span></div>`;
      if (!list.length) {
        html += `<div class="note warm"><strong>No strong matches right now.</strong> These boards lean towards remote and European roles. Try a broader job title in <a href="#/quiz">your answers</a>${j.adzuna ? '' : ', or add a free Adzuna key for local listings (see the README)'}.</div>`;
      }
      html += list.map((x, i) => `<div class="card job"><div class="item-head"><div><h3>${esc(x.title)}</h3><p class="muted">${esc(x.company || 'Company not listed')} · ${esc(x.location || 'Location not listed')}</p></div><div class="match">${x.match}%<small>match</small></div></div>
        <ul class="reasons">${x.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
        <p class="snippet">${esc(x.snippet)}${x.snippet.length >= 260 ? '…' : ''}</p>
        <div class="row" style="margin-top:14px"><a class="btn small" href="${safeUrl(x.url)}" target="_blank" rel="noopener noreferrer">View and apply</a>
          ${x.recruiterUrl ? `<a class="btn ghost small" href="${safeUrl(x.recruiterUrl)}" target="_blank" rel="noopener noreferrer">Find recruiters on LinkedIn</a><button class="btn ghost small" data-msg="${i}" type="button">Copy a message to send</button>` : ''}
          <span class="muted small" style="margin-left:auto">${x.posted ? `Posted ${esc(x.posted)} · ` : ''}via ${esc(x.source)}</span></div></div>`).join('');
      html += '<p class="small muted" style="margin-top:18px">The LinkedIn button opens a people search for recruiters at that company in your own LinkedIn account. Match scores are a guide based on your answers, not a prediction.</p>';
      app.innerHTML = html;
      $('#find').onclick = fetchJobs;
      $('#remote-only').onchange = (e) => { state.remoteOnly = e.target.checked; draw(); };
      $$('[data-msg]').forEach((b) => { b.onclick = () => copy(outreach(list[+b.dataset.msg])); });
    };
    const fetchJobs = async () => {
      app.innerHTML = intro + loading('Checking job boards for current postings');
      try { state.jobs = await post('/api/jobs', { profile: state.profile }); draw(); }
      catch (err) { app.innerHTML = intro + failed(err); }
    };
    draw();
  }

  // --------------------------------------------------------------- router ---
  const VIEWS = { summary: viewSummary, roadmap: viewRoadmap, refresher: viewRefresher, courses: viewCourses, resume: viewResume, jobs: viewJobs };
  async function route() {
    let key = (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
    // New and returning unfinished visitors go straight to their saved question.
    if (!state.done && key !== 'quiz') {
      key = 'quiz';
      history.replaceState(null, '', '#/quiz');
    }
    const nav = $('#nav');
    nav.hidden = !state.done || key === 'quiz';
    $('#reset').hidden = !Object.keys(state.profile).length;
    nav.innerHTML = STEPS.map(([k, label]) => `<a href="#/${k}"${k === key ? ' aria-current="page"' : ''}>${label}</a>`).join('');
    window.scrollTo(0, 0);
    if (key === 'quiz') { if (state.done) state.step = 0; renderQuiz(); return; }
    if (!VIEWS[key] || !state.done) { if (key && key !== '') history.replaceState(null, '', '#/'); viewWelcome(); return; }
    try { await VIEWS[key](); } catch (err) { app.innerHTML = failed(err); }
    app.focus({ preventScroll: true });
  }

  $('#reset').onclick = () => {
    if (!confirm('This clears your answers, plan progress and resume from this browser. Continue?')) return;
    store.clear();
    Object.assign(state, { profile: {}, done: false, step: 0, cache: {}, ticks: {}, resumeText: '', jobs: null });
    location.hash = '#/'; route();
  };

  fetch('/api/config').then((r) => r.json()).then((config) => {
    state.config = config;
    window.addEventListener('hashchange', route);
    route();
  }).catch(() => { app.innerHTML = '<div class="note warm"><strong>The app could not reach its server.</strong> Start it with <code>python3 server.py</code> and reload.</div>'; });
})();
