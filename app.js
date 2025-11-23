const storage = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)) }
}
const KEYS = { entries: 'mh_entries' }

function todayKey() {
  const d = new Date(); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const day = String(d.getDate()).padStart(2,'0')
  return `${y}-${m}-${day}`
}
function getEntries() { return storage.get(KEYS.entries, []) }
function saveEntry(entry) {
  const list = getEntries()
  list.push(entry)
  storage.set(KEYS.entries, list)
}

function formatDateTime(ts) {
  try {
    const d = new Date(ts);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');

    return `${day}-${month}-${year} ${hrs}:${mins}:${secs}`;
  } catch {
    return '';
  }
}

function average(arr) { if (!arr.length) return 0; return Math.round((arr.reduce((a,b)=>a+b,0)/arr.length)*100)/100 }
function renderHistoryList() {
  const list = document.getElementById('historyList')
  list.innerHTML = ''
  const entries = getEntries().slice().sort((a,b)=>b.timestamp-a.timestamp)
  entries.forEach(e => {
    const li = document.createElement('li')
    li.className = 'history-item'
    const emoji = document.createElement('div')
    emoji.className = 'history-emoji'
    emoji.textContent = (moods.find(m=>m.id===e.mood)?.emoji) || '•'
    const content = document.createElement('div')
    content.className = 'history-content'
    const note = document.createElement('div')
    note.className = 'note'
    note.textContent = e.note ? e.note : '(no note)'
    const meta = document.createElement('div')
    meta.className = 'meta'
    meta.textContent = `${formatDateTime(e.timestamp)} • ${e.mood}`
    content.appendChild(note)
    content.appendChild(meta)
    const actions = document.createElement('div')
    actions.className = 'history-actions'
    const del = document.createElement('button')
    del.className = 'danger'
    del.textContent = 'Delete'
    del.addEventListener('click', () => {
      const remaining = getEntries().filter(x => x.timestamp !== e.timestamp)
      storage.set(KEYS.entries, remaining)
      renderAll()
    })
    actions.appendChild(del)
    li.appendChild(emoji)
    li.appendChild(content)
    li.appendChild(actions)
    list.appendChild(li)
  })
}

function patternState(entries = getEntries()) {
  const recent = entries.slice().sort((a,b)=>a.timestamp - b.timestamp).slice(-7)
  const avg = average(recent.map(e=>e.score))
  const streakNeg = (()=>{let c=0; for(let i=recent.length-1;i>=0;i--){ if(recent[i].score<=2) c++; else break } return c})()
  const negative = avg && avg < 2.5 || streakNeg >= 2
  return { avg, negative }
}
async function fetchQuote(tag) {
  try { const res = await fetch(`https://api.quotable.io/random?maxLength=140${tag?`&tags=${encodeURIComponent(tag)}`:''}`); const j = await res.json(); if (j && j.content) return j.content } catch {}
  const offline = ['You are enough.','One gentle step at a time.','Breathe in, breathe out.','Small progress is still progress.','Let today be kind.']
  return offline[Math.floor(Math.random()*offline.length)]
}
const MUSIC_BY_MOOD = {
  ecstatic: { title: 'Upbeat Happy Mix – YouTube', url: 'https://open.spotify.com/album/2qlACQ7bcc67sbjWCiaDL7' },
  happy: { title: 'Happy Instrumental – YouTube', url: 'https://youtu.be/TWcyIpul8OE' },
  angry: { title: 'Calm – YouTube', url: 'https://youtu.be/O9wjmEhMKFw' },
  shocked: { title: 'Lo‑Fi Focus – YouTube', url: 'https://youtu.be/7maJOI3QMu0' },
  //anxious: { title: 'Meditation & Breath – YouTube', url: 'https://www.youtube.com/results?search_query=meditation+breathing+music+playlist' },//
  sad: { title: 'Comforting Acoustic – YouTube', url: 'https://youtu.be/B1T-MKTxKN0' },
  boring: { title: 'Peaceful  – YouTube', url: 'https://youtu.be/v7HaOYWdb4o' }
}
function musicForMood(moodId) { return MUSIC_BY_MOOD[moodId] || MUSIC_BY_MOOD['neutral'] }
function firstTitle(r) { return r.collectionName || r.trackName || 'Album' }
async function renderRecommendations(quoteEl, musicListEl, entries = getEntries()) {
  const p = patternState(entries)
  quoteEl.textContent = ''
  musicListEl.innerHTML = ''
  const tag = p.negative ? 'calm' : 'inspirational'
  const q = await fetchQuote(tag)
  quoteEl.textContent = q
  const last = entries.slice().sort((a,b)=>b.timestamp-a.timestamp)[0]
  const item = musicForMood(last ? last.mood : 'neutral')
  const li = document.createElement('li')
  const a = document.createElement('a')
  a.href = item.url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.textContent = item.title
  li.appendChild(a)
  musicListEl.appendChild(li)
}

const moods = [
  { id: 'ecstatic', label: 'Ecstatic', emoji: '🤩', score: 5 },
  { id: 'happy', label: 'Happy', emoji: '😊', score: 4 },
  { id: 'angry', label: 'Angry', emoji: '😠', score: 3 },
  { id: 'shocked', label: 'Shocked', emoji: '😨', score: 3 },
 //  { id: 'anxious', label: 'Anxious', emoji: '😟', score: 2 },//
  { id: 'sad', label: 'Sad', emoji: '😭', score: 1 },
  { id: 'boring', label: 'Boring', emoji: '🥱', score: 1 }
]
let selectedMood = null
const el = {
  moodButtons: document.querySelectorAll('.mood'),
  note: document.getElementById('noteInput'),
  save: document.getElementById('saveEntry'),
  feedback: document.getElementById('feedback'),
  historyList: document.getElementById('historyList'),
  clearHistory: document.getElementById('clearHistory'),
  quoteText: document.getElementById('quoteText'),
  musicList: document.getElementById('musicList')
}
function setFeedback(t) { el.feedback.textContent = t }
function selectMood(id) {
  selectedMood = id
  el.moodButtons.forEach(b => b.setAttribute('aria-checked', String(b.dataset.id === id)))
}
el.moodButtons.forEach(b => b.addEventListener('click', () => { selectMood(b.dataset.id); setFeedback('Mood selected') }))
el.save.addEventListener('click', () => {
  if (!selectedMood) { setFeedback('Choose a mood to save'); return }
  const note = el.note.value.trim()
  const mood = moods.find(m => m.id === selectedMood)
  const entry = { date: todayKey(), timestamp: Date.now(), mood: mood.id, score: mood.score, note }
  saveEntry(entry)
  setFeedback('Saved. Thank you for checking in.')
  el.note.value = ''
  renderAll()
})

function renderAll() {
  renderHistoryList()
  renderRecommendations(el.quoteText, el.musicList, getEntries())
}
if (el.clearHistory) el.clearHistory.addEventListener('click', () => {
  storage.set(KEYS.entries, [])
  renderAll()
})
renderAll()
