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
   
   function clearUserSession() {
      localStorage.clear(); // Clears all local profile state
      window.location.href = "/"; // Reloads back to a clean slate
  }
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
    interview: store.get('interview', { turns: [], question: '', roadmap: null }),
    chat: store.get('chat', null),      // { messages: [{role, text}], previousId, greeting, suggestions, ready }
    plan: store.get('plan', null),      // the roadmap: { mode, understood, decisions, weeks, ... }
  };
  // The questionnaire gained new questions; restart its position for existing
  // profiles so an old saved step cannot skip them. Keep all saved answers.
  if (store.get('quizVersion', 0) < 2) {
    state.step = 0;
    store.set('step', 0);
    store.set('quizVersion', 2);
  }
  const saveProfile = () => store.set('profile', state.profile);

  async function cached(key, path, body) {
    if (state.cache[key]) return state.cache[key];
    const data = await post(path, body);
    state.cache[key] = data; store.set('cache', state.cache);
    return data;
  }

  // ------------------------------------------------------------ questions ---
  const SECTIONS = ['Your starting point'];
  function questions() {
    const c = state.config;
    return [
      { id: 'name', section: 0, type: 'text', q: 'What should we call you?', placeholder: 'Your name' },
      { id: 'lastRole', section: 0, type: 'text', q: 'What was your most recent role?', placeholder: 'For example, Marketing manager' },
      { id: 'field', section: 0, type: 'single', cols: true, q: 'Which field did you previously work in?', options: c.fields.map((f) => [f.key, f.label]) },
      { id: 'strengths', section: 0, type: 'text', q: 'Which skills and tools are you most confident in?', hint: 'List your strongest skills and tools, separated by commas.', placeholder: 'For example, project planning, Excel, writing' },
      { id: 'awayDate', section: 0, type: 'month', past: true, q: 'When did you step away from work?', hint: 'A rough month is fine.' },
      { id: 'improvement', section: 0, type: 'textarea', q: 'Where would you like to improve most?', hint: 'Think about skills, tools, confidence or anything else you want to work on.' },
      { id: 'startDate', section: 0, type: 'month', q: 'When would you like to be back at work?', hint: 'A target, not a deadline.' },
      { id: 'education', section: 0, type: 'text', q: 'Tell us about your education.', hint: 'Include any qualifications, training or education you would like to share.', placeholder: 'For example, BA in Business or a technical certificate' },
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

  function cheer() {
    return { title: 'That is everything we need.', body: '<p>You have just done the hardest part, which is starting. Your summary and plan are ready.</p>', final: true };
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
    state.interview = { turns: [], question: '', roadmap: null };
    store.set('interview', state.interview);
    state.plan = null; store.set('plan', null);   // the roadmap is rebuilt after the conversation
    if (state.chat && state.chat.messages.length < 2) { state.chat = null; store.set('chat', null); }
    location.hash = '#/summary';
  }

  // ---------------------------------------------------------------- views ---
  const STEPS = [['interview', 'Skills interview'], ['chat', 'Coach chat'], ['summary', 'Summary'], ['roadmap', 'Roadmap'], ['refresher', 'What changed'], ['courses', 'Courses'], ['resume', 'Resume'], ['jobs', 'Jobs']];
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
        ${state.done ? `<a class="btn ghost" href="#/${state.plan ? 'roadmap' : 'chat'}">${state.plan ? 'Go to my roadmap' : 'Continue to the conversation'}</a>` : ''}
      </div>
      <ol class="steps-preview">
        <li><strong>A short questionnaire</strong><span class="muted small">About your strengths first, gaps second.</span></li>
        <li><strong>A conversation</strong><span class="muted small">A coach asks what a form cannot, in your own words.</span></li>
        <li><strong>Your roadmap</strong><span class="muted small">A week-by-week plan built from what the coach understood.</span></li>
        <li><strong>What changed</strong><span class="muted small">A refresher on your field since you left.</span></li>
        <li><strong>Courses</strong><span class="muted small">Matched to your role, time and budget.</span></li>
        <li><strong>Resume edits</strong><span class="muted small">Specific changes, including how to present the gap.</span></li>
        <li><strong>Live jobs and recruiters</strong><span class="muted small">Current postings ranked for you, with who to contact.</span></li>
      </ol></section>`;
  }

  async function viewInterview() {
    const data = state.interview;
    const save = () => store.set('interview', data);
    const payload = () => ({ profile: state.profile, turns: data.turns });
    const draw = () => {
      app.innerHTML = head('Conversation', 'Let’s explore your experience.', 'Share only what you are comfortable sharing. Your profile and conversation will be sent to Google Gemini to generate questions and your roadmap. You can skip a question or finish at any time.') +
        data.turns.map((t) => `<div class="card stack"><strong>${esc(t.question)}</strong><p>${esc(t.answer)}</p></div>`).join('') +
        (data.question ? `<div class="card stack"><h2>${esc(data.question)}</h2><label for="interview-answer">Your answer</label><textarea class="field" id="interview-answer" maxlength="4000"></textarea><div class="row"><button class="btn" id="answer" type="button">Continue</button><button class="btn ghost" id="skip-question" type="button">Skip question</button></div></div>` : `<button class="btn" id="start-interview" type="button">${data.turns.length ? 'Continue conversation' : 'Start conversation'}</button>`) +
        `<div class="row" style="margin-top:20px"><button class="btn ghost" id="finish-interview" type="button">Generate my roadmap</button></div><p class="small muted" id="interview-status" role="status"></p>`;
      const ask = async () => {
        $('#interview-status').textContent = 'Preparing your next question…';
        $$('button', app).forEach((b) => { b.disabled = true; });
        try { const result = await post('/api/interview/question', payload()); data.question = result.question; save(); draw(); }
        catch (err) { $('#interview-status').textContent = err.message; $$('button', app).forEach((b) => { b.disabled = false; }); }
      };
      if ($('#start-interview')) $('#start-interview').onclick = ask;
      const submit = (answer) => { data.turns.push({ question: data.question, answer }); data.question = ''; data.roadmap = null; save(); draw(); ask(); };
      if ($('#answer')) $('#answer').onclick = () => { const answer = $('#interview-answer').value.trim(); if (answer) submit(answer); else $('#interview-status').textContent = 'Enter an answer or skip this question.'; };
      if ($('#skip-question')) $('#skip-question').onclick = () => submit('Skipped');
      $('#finish-interview').onclick = async () => {
        $('#interview-status').textContent = 'Building your roadmap…';
        $$('button', app).forEach((b) => { b.disabled = true; });
        try { data.roadmap = await post('/api/interview/roadmap', payload()); save(); location.hash = '#/interview-roadmap'; }
        catch (err) { $('#interview-status').textContent = err.message; $$('button', app).forEach((b) => { b.disabled = false; }); }
      };
    };
    draw();
  }

  async function viewSummary() {
    app.innerHTML = loading('Putting your summary together');
    const s = await cached('summary', '/api/summary', { profile: state.profile });
    // Shows only what the onboarding questionnaire asks: name, last role, field,
    // skills and tools, when they stepped away, where to improve, start date, education.
    const p = state.profile;
    const field = (state.config.fields.find((f) => f.key === p.field) || {}).label;
    const start = monthLabel(p.startDate);
    app.innerHTML = head('Your summary', s.headline.charAt(0).toUpperCase() + s.headline.slice(1), esc(s.awayNote)) + `
      <div class="grid two">
        <div class="card stack"><h2>Your skills and tools</h2>
          <div class="chips">${s.strengths.filter((x) => x.from !== 'break').map((x) => `<span class="chip">${esc(x.text)}</span>`).join('') || '<span class="muted">Add a few in the questionnaire and they will appear here.</span>'}</div></div>
        <div class="card stack"><h2>Where you are heading</h2><p style="font-size:1.25rem;font-weight:600">${esc(p.lastRole || 'Your next role')}</p>
          <div class="chips">${[field, start ? `Back at work by ${start}` : ''].filter(Boolean).map((x) => `<span class="chip plain">${esc(x)}</span>`).join('')}</div>
          <p class="small muted">${s.weeks} weeks to prepare. Your roadmap is paced to this.</p></div>
        <div class="card stack"><h2>Where you want to grow</h2><p>${esc(p.improvement || 'Not answered yet.')}</p>
          <p class="small muted">Your roadmap and courses focus on this first.</p></div>
        <div class="card stack"><h2>Your education</h2><p>${esc(p.education || 'Not answered yet.')}</p>
          <p class="small muted">It goes on your resume as it is. Lapsed certificates still count.</p></div>
      </div>
      <div class="card stack" style="margin-top:16px"><div class="row spread"><h2>Your gap, in one sentence</h2><button class="btn ghost small" id="copy-gap" type="button">Copy</button></div>
        <p class="quote">${esc(s.gapLine)}</p><p class="small muted">Use this on your resume and LinkedIn, and as the start of your answer in interviews.</p></div>
      <h2 style="margin:34px 0 14px">Your first three steps</h2>
      <div class="next">${s.firstSteps.map((f) => `<a href="#/${esc(f.step)}">${esc(f.text)}</a>`).join('')}</div>
      <p class="small muted" style="margin-top:24px"><a href="#/quiz">Edit my answers</a></p>`;
    $('#copy-gap').onclick = () => copy(s.gapLine);
  }

  async function viewInterviewRoadmap() {
    const plan = state.interview.roadmap;
    if (plan) {
      const findings = (items) => items.map((x) => `<li><strong>${esc(x.name)}</strong>: ${esc(x.assessment)} <span class="muted">Evidence: ${esc(x.evidence)}</span></li>`).join('');
      app.innerHTML = head('Your roadmap', 'A plan built around you.', esc(plan.summary)) +
        `<div class="card stack"><h2>Strengths</h2><ul>${findings(plan.strengths)}</ul><h2>Areas to explore or develop</h2><ul>${findings(plan.growth_areas)}</ul><h2>Still to clarify</h2><ul>${plan.unknowns.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` +
        plan.steps.map((s, i) => `<div class="card stack"><h2>${i + 1}. ${esc(s.title)}</h2><p>${esc(s.action)}</p><p><strong>Resources:</strong> ${esc(s.resource_guidance)}</p><p class="muted">${esc(s.timeframe)}</p></div>`).join('') +
        '<p class="small muted">AI-generated guidance is informational; verify resources and requirements before acting.</p><a href="#/interview">Continue the conversation</a>';
      return;
    }
    location.hash = '#/interview';
  }

  async function viewRoadmap() {
    const title = head('Your roadmap', 'One week at a time.', 'Three small tasks a week: one to learn, one for your career, one for your confidence.');
    if (!state.plan) {
      app.innerHTML = title + loading(state.chat && state.chat.messages.length > 1 && state.config.coach.enabled ? 'Building your roadmap from your answers and your conversation. This can take a minute.' : 'Building your roadmap');
      await buildPlan();
    }
    const r = state.plan;
    const list = (items) => `<ul class="plain-list">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    const draw = () => {
      const total = r.weeks.reduce((n, w) => n + w.tasks.length, 0);
      const done = r.weeks.reduce((n, w) => n + w.tasks.filter((_, i) => state.ticks[`${w.week}-${i}`]).length, 0);
      const current = r.weeks.find((w) => w.tasks.some((_, i) => !state.ticks[`${w.week}-${i}`]));
      const talked = state.chat && state.chat.messages.length > 1;
      let html = head('Your roadmap', 'One week at a time.', `${r.totalWeeks} weeks at about ${r.hoursPerWeek} hours a week. Three small tasks each week: one to learn, one for your career, one for your confidence.`);
      if (r.mode === 'live') {
        html += `<div class="card stack" style="margin-bottom:16px"><div class="row spread"><span class="chip">Built from your conversation</span><button class="btn ghost small" id="rebuild" type="button">Rebuild my roadmap</button></div>
          <div class="grid two"><div><h3>What your coach understood</h3>${list(r.understood)}</div><div><h3>How that shaped your plan</h3>${list(r.decisions)}</div></div>
          <p class="small muted">Not quite right? <a href="#/chat">Tell your coach</a>, then rebuild.</p></div>`;
      } else {
        html += `<div class="note" style="margin-bottom:16px"><div class="row spread"><span><strong>This is the standard plan from your questionnaire.</strong> ${esc(r.note || '')}</span>
          <span class="row">${talked ? '' : '<a class="btn ghost small" href="#/chat">Have the conversation</a>'}<button class="btn ghost small" id="rebuild" type="button">Rebuild</button></span></div></div>`;
      }
      html += `<div class="card"><div class="row spread"><strong>${done === 0 ? 'Tick your first task to get going' : done === total ? 'Plan complete. You are ready.' : `${done} of ${total} tasks done`}</strong><span class="muted small">${current ? `You are on week ${current.week}` : ''}</span></div><div class="bar" style="margin-top:12px"><i style="width:${Math.round((done / total) * 100)}%"></i></div></div>`;
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
      app.innerHTML = html + '</section>' + nextStep('summary', 'Your summary');
      $('#rebuild').onclick = async () => {
        if (done && !confirm('Rebuilding replaces this plan and clears the tasks you have ticked. Continue?')) return;
        state.plan = null; store.set('plan', null);
        try { await viewRoadmap(); } catch (err) { app.innerHTML = failed(err); }
      };
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
      html += nextStep('chat', 'Talk it through with your coach');
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

  // --------------------------------------------------------- conversation ---
  // Step two of the journey. Before a plan exists the agent interviews the
  // person; the plan is then built from the questionnaire and this
  // conversation; afterwards the same chat coaches from the plan.
  // (The interview comes from Michelle's Streamlit prototype.)
  const richText = (t) => esc(t).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  function coachPayload(message) {
    const r = state.cache.resume;
    return {
      profile: state.profile, ticks: state.ticks, message,
      hasPlan: !!state.plan, weeks: state.plan ? state.plan.weeks : null, understood: state.plan ? state.plan.understood : null,
      previousId: state.chat && state.chat.previousId, greeting: state.chat && state.chat.greeting,
      resume: r ? { score: r.score, edits: r.edits.slice(0, 6).map((e) => e.title) } : null,
      jobs: state.jobs ? state.jobs.jobs.slice(0, 6).map((j) => ({ title: j.title, company: j.company, match: j.match })) : null,
    };
  }

  // Ask the server for the roadmap. With Gemini on and a conversation to read,
  // it is written from what the agent understood; otherwise it is the standard plan.
  async function buildPlan() {
    const transcript = state.chat ? state.chat.messages.map((m) => ({ role: m.role, text: m.text })) : [];
    const plan = await post('/api/plan', { profile: state.profile, transcript });
    state.plan = plan; store.set('plan', plan);
    state.ticks = {}; store.set('ticks', {});      // a new plan has new tasks
    return plan;
  }

  async function viewChat() {
    const status = state.config.coach || { enabled: false, reason: 'The conversation is not available.' };
    const intro = state.plan
      ? head('Conversation', 'Talk it through.', 'Your coach knows your answers, your plan and where you are in it. Ask what to do next, practise your gap answer, or run a mock interview.')
      : head('Step 2 of 3 · Conversation', 'Now, in your own words.', 'A short conversation, about five questions, so your roadmap fits your real life and not just a form. Your coach will say when it has enough.');
    if (!state.chat) {
      app.innerHTML = intro + loading('Getting your coach ready');
      const start = await post('/api/coach/start', coachPayload(''));
      state.chat = { messages: [{ role: 'coach', text: start.greeting }], previousId: null, greeting: start.greeting, suggestions: start.suggestions, ready: false };
      store.set('chat', state.chat);
    }
    const chat = state.chat;
    let busy = false;
    app.innerHTML = intro + `${status.enabled ? '' : `<div class="note warm" style="margin-bottom:16px"><strong>The conversation is not switched on yet.</strong> ${esc(status.reason)} You can still build the standard roadmap from your questionnaire answers.</div>`}
      <div class="card chat"><div class="chat-log" id="chat-log" aria-live="polite"></div>
        <div class="chips suggest" id="chat-suggest"></div>
        <form class="chat-form" id="chat-form"><textarea class="field" id="chat-input" rows="1" maxlength="4000" placeholder="Type your answer" aria-label="Message to your coach"${status.enabled ? '' : ' disabled'}></textarea>
          <button class="btn" id="chat-send" type="submit"${status.enabled ? '' : ' disabled'}>Send</button></form></div>
      <div class="build" id="build-bar"></div>
      <p class="small muted" style="margin-top:12px">Your messages, answers and plan are sent to Google Gemini to produce replies. <button class="link" id="chat-new" type="button">Start the conversation again</button></p>`;
    const log = $('#chat-log'); const input = $('#chat-input'); const sendBtn = $('#chat-send');
    const bubble = (m) => `<div class="msg ${m.role}"><span class="who">${m.role === 'coach' ? 'Coach' : 'You'}</span><div class="bubble">${richText(m.text)}</div></div>`;
    const build = async () => {
      app.innerHTML = intro + loading(status.enabled && chat.messages.length > 1 ? 'Building your roadmap from your answers and this conversation. This can take a minute.' : 'Building your roadmap');
      try { await buildPlan(); location.hash = '#/roadmap'; }
      catch (err) { app.innerHTML = intro + failed(err); }
    };
    const draw = () => {
      log.innerHTML = chat.messages.map(bubble).join('');
      log.scrollTop = log.scrollHeight;
      const fresh = chat.messages.length === 1 && status.enabled;
      $('#chat-suggest').innerHTML = fresh ? chat.suggestions.map((s) => `<button type="button" data-say="${esc(s)}">${esc(s)}</button>`).join('') : '';
      $$('[data-say]').forEach((b) => { b.onclick = () => send(b.dataset.say); });
      const bar = $('#build-bar'); const answers = chat.messages.filter((m) => m.role === 'you').length;
      if (state.plan) bar.innerHTML = '<span class="muted small">Your roadmap is built. If something changes, rebuild it from the Roadmap screen.</span><a class="btn ghost small" href="#/roadmap">Open my roadmap</a>';
      else if (!status.enabled) bar.innerHTML = '<span class="muted small">Step 3 of 3</span><button class="btn" id="build" type="button">Build my roadmap</button>';
      else if (chat.ready) bar.innerHTML = '<span><strong>Your coach has what it needs.</strong> <span class="muted small">Step 3 of 3</span></span><button class="btn" id="build" type="button">Build my roadmap</button>';
      else bar.innerHTML = `<span class="muted small">${answers ? `${answers} answer${answers === 1 ? '' : 's'} so far. Your coach will say when it has enough.` : 'Answer in as much detail as you like.'}</span><button class="btn ghost small" id="build" type="button">${answers ? 'Build my roadmap now' : 'Skip and build my roadmap'}</button>`;
      if ($('#build')) $('#build').onclick = build;
    };

    async function send(text) {
      text = String(text || '').trim();
      if (!text || busy || !status.enabled) return;
      busy = true; sendBtn.disabled = true; input.value = '';
      chat.messages.push({ role: 'you', text });
      const reply = { role: 'coach', text: '' };
      chat.messages.push(reply); draw();
      const target = log.lastElementChild.querySelector('.bubble');
      target.innerHTML = '<span class="typing">Thinking</span>';
      try {
        const res = await fetch('/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(coachPayload(text)) });
        if (!res.ok || !res.body) { const data = await res.json().catch(() => ({})); throw new Error(data.error || 'The coach could not reply just now.'); }
        const reader = res.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
        const handle = (line) => {
          if (!line.trim()) return;
          const event = JSON.parse(line);
          if (event.id) chat.previousId = event.id;
          if (event.text) { reply.text += event.text; target.innerHTML = richText(reply.text); log.scrollTop = log.scrollHeight; }
          if (event.ready) chat.ready = true;          // the agent decided it knows enough
          if (event.error) throw new Error(event.error);
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n'); buffer = lines.pop();
          lines.forEach(handle);
        }
        handle(buffer);
        reply.text = reply.text.trim();
        if (!reply.text) throw new Error('The coach sent an empty reply. Please try again.');
      } catch (err) {
        toast(err.message || 'The coach could not reply just now.');
        if (!reply.text) {
          // Nothing arrived: drop both bubbles and hand the message back so it is not lost.
          chat.messages.splice(-2, 2);
          input.value = text;
        }
      }
      store.set('chat', chat);
      busy = false; sendBtn.disabled = false; draw(); input.focus();
    }

    $('#chat-form').onsubmit = (e) => { e.preventDefault(); send(input.value); };
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } };
    $('#chat-new').onclick = () => { state.chat = null; store.set('chat', null); viewChat().catch((err) => { app.innerHTML = failed(err); }); };
    draw();
    if (status.enabled) input.focus();
  }

  // --------------------------------------------------------------- router ---
  const VIEWS = { interview: viewInterview, "interview-roadmap": viewInterviewRoadmap, chat: viewChat, summary: viewSummary, roadmap: viewRoadmap, refresher: viewRefresher, courses: viewCourses, resume: viewResume, jobs: viewJobs };
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
    Object.assign(state, { profile: {}, done: false, step: 0, cache: {}, ticks: {}, resumeText: '', jobs: null, interview: { turns: [], question: '', roadmap: null }, chat: null, plan: null });
    location.hash = '#/'; route();
  };

  fetch('/api/config').then((r) => r.json()).then((config) => {
    state.config = config;
    window.addEventListener('hashchange', route);
    route();
  }).catch(() => { app.innerHTML = '<div class="note warm"><strong>The app could not reach its server.</strong> Start it with <code>python3 server.py</code> and reload.</div>'; });
})();
