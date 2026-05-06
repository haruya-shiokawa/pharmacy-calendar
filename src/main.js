import './style.css'

const STORAGE_KEY = 'pharmacy-calendar-data'
// 本番環境とローカル環境でAPIのURLを切り替え
const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001/api/data'
  : '/api/data'

const app = document.querySelector('#app')
const today = new Date()
let currentYear = today.getFullYear()
let currentMonth = today.getMonth()
let state = {}
let useServerStorage = false

// 初期化
init()

async function init() {
  // サーバーからデータを取得試行
  try {
    const response = await fetch(API_URL)
    if (response.ok) {
      state = await response.json()
      useServerStorage = true
      console.log('サーバーストレージを使用します')
    } else {
      throw new Error('Server not available')
    }
  } catch (error) {
    console.log('ローカルストレージを使用します')
    state = loadState()
    useServerStorage = false
  }
  render()
}

function render() {
  const calendar = buildCalendar(currentYear, currentMonth, state)
  const monthLabel = `${currentYear}年${currentMonth + 1}月`
  const storageIndicator = useServerStorage 
    ? '<span class="storage-indicator server">🌐 サーバー保存</span>' 
    : '<span class="storage-indicator local">💾 ローカル保存</span>'

  app.innerHTML = `
    <main class="page">
      <header class="page-header no-print">
        <div class="month-nav">
          <button type="button" id="prev-month">前の月</button>
          <strong>${monthLabel}</strong>
          <button type="button" id="next-month">次の月</button>
        </div>
        <div class="action-buttons">
          ${storageIndicator}
          <button type="button" id="clear-month-data" class="action-btn">🗑️ 今月のデータ削除</button>
          <button type="button" id="export-csv" class="action-btn">📊 CSV出力</button>
          <button type="button" id="print-calendar" class="action-btn">🖨️ 印刷</button>
        </div>
      </header>

      <div class="print-header">
        <h1>${monthLabel}</h1>
      </div>

      <section class="calendar">${calendar}</section>
    </main>
  `

  bindEvents()
}

function bindEvents() {
  document.querySelector('#prev-month').addEventListener('click', () => {
    currentMonth -= 1
    if (currentMonth < 0) {
      currentMonth = 11
      currentYear -= 1
    }
    render()
  })

  document.querySelector('#next-month').addEventListener('click', () => {
    currentMonth += 1
    if (currentMonth > 11) {
      currentMonth = 0
      currentYear += 1
    }
    render()
  })

  document.querySelector('#clear-month-data').addEventListener('click', clearMonthData)
  document.querySelector('#export-csv').addEventListener('click', exportToCSV)
  document.querySelector('#print-calendar').addEventListener('click', printCalendar)

  document.querySelectorAll('.name-input, .days-input').forEach((input) => {
    input.addEventListener('change', handleInputChange)
  })

  document.querySelectorAll('.add-entry-btn').forEach((btn) => {
    btn.addEventListener('click', handleAddEntry)
  })

  document.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', handleRemoveEntry)
  })

  document.querySelectorAll('.custom-btn').forEach((btn) => {
    btn.addEventListener('click', handleCustomEntry)
  })

  document.querySelectorAll('.clear-day-btn').forEach((btn) => {
    btn.addEventListener('click', handleClearDay)
  })
}

function handleAddEntry(event) {
  const date = event.target.dataset.date
  ensureDay(date)
  // 空のスロットを追加し、一時的にスペースを入れて表示されるようにする
  state[date].slots.push({
    name: '',
    days: '',
    isAuto: false,
    isNew: true, // 新規追加フラグ
  })
  saveState()
  render()
  
  // 新しく追加された入力欄にフォーカス
  setTimeout(() => {
    const entries = document.querySelector(`[data-date="${date}"]`)
    if (entries) {
      const inputs = entries.querySelectorAll('.name-input')
      const lastInput = inputs[inputs.length - 1]
      if (lastInput) {
        lastInput.focus()
      }
    }
  }, 0)
}

function handleRemoveEntry(event) {
  const { date, index } = event.target.dataset
  const slotIndex = Number(index)
  
  if (state[date] && state[date].slots[slotIndex]) {
    // スロットを削除（自動エントリーも手動エントリーも同じ処理）
    state[date].slots.splice(slotIndex, 1)
    
    // スロットが空になった場合は、その日のデータを削除
    if (state[date].slots.length === 0) {
      delete state[date]
    }
    
    // 再構築は行わない（自動エントリーは残る）
    saveState()
    render()
  }
}

function handleClearDay(event) {
  const { date } = event.target.dataset
  
  if (!state[date]) {
    return
  }
  
  const confirmed = confirm('この日のすべての予定を削除しますか？')
  
  if (!confirmed) {
    return
  }
  
  // その日のデータを削除
  delete state[date]
  
  saveState()
  render()
}

function handleCustomEntry(event) {
  const { date, index } = event.target.dataset
  const slotIndex = Number(index)
  
  if (!state[date] || !state[date].slots[slotIndex]) {
    return
  }
  
  const slot = state[date].slots[slotIndex]
  
  // 名前が入力されていない場合は警告
  if (!slot.name) {
    alert('名前を入力してください')
    return
  }
  
  // ポップオーバーを表示
  showCustomPopover(event.target, date, slotIndex, slot)
}

function showCustomPopover(buttonElement, date, slotIndex, slot) {
  // 既存のポップオーバーを削除
  const existingPopover = document.querySelector('.custom-popover')
  const existingOverlay = document.querySelector('.custom-popover-overlay')
  if (existingPopover) existingPopover.remove()
  if (existingOverlay) existingOverlay.remove()
  
  // オーバーレイを作成
  const overlay = document.createElement('div')
  overlay.className = 'custom-popover-overlay'
  
  // カレンダーの初期月を現在の月に設定
  let calendarYear = currentYear
  let calendarMonth = currentMonth
  const selectedDates = new Set()
  
  // ポップオーバーを作成
  const popover = document.createElement('div')
  popover.className = 'custom-popover'
  popover.innerHTML = `
    <div class="custom-popover-header">
      ${escapeHtml(slot.name)} の予定作成
    </div>
    <div class="custom-popover-body">
      <div class="calendar-picker-header">
        <button id="calendar-prev-month">◀</button>
        <span class="calendar-picker-month" id="calendar-month-label"></span>
        <button id="calendar-next-month">▶</button>
      </div>
      <div class="calendar-picker" id="calendar-picker"></div>
      <div class="selected-dates-info" id="selected-dates-info">0件選択中</div>
    </div>
    <div class="custom-popover-buttons">
      <button class="custom-popover-btn secondary" id="custom-cancel">キャンセル</button>
      <button class="custom-popover-btn primary" id="custom-apply">作成</button>
    </div>
  `
  
  // ボタンの位置を取得してポップオーバーを配置
  const rect = buttonElement.getBoundingClientRect()
  popover.style.left = `${rect.left}px`
  popover.style.top = `${rect.bottom + 5}px`
  
  // 画面外に出ないように調整
  document.body.appendChild(popover)
  const popoverRect = popover.getBoundingClientRect()
  if (popoverRect.right > window.innerWidth) {
    popover.style.left = `${window.innerWidth - popoverRect.width - 10}px`
  }
  if (popoverRect.bottom > window.innerHeight) {
    popover.style.top = `${rect.top - popoverRect.height - 5}px`
  }
  
  document.body.appendChild(overlay)
  
  // イベントリスナーを設定
  const closePopover = () => {
    popover.remove()
    overlay.remove()
  }
  
  overlay.addEventListener('click', closePopover)
  
  document.getElementById('custom-cancel').addEventListener('click', closePopover)
  
  // カレンダーを描画する関数
  function renderCalendarPicker() {
    const monthLabel = document.getElementById('calendar-month-label')
    monthLabel.textContent = `${calendarYear}年${calendarMonth + 1}月`
    
    const picker = document.getElementById('calendar-picker')
    const firstDay = new Date(calendarYear, calendarMonth, 1)
    const startWeekday = firstDay.getDay()
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
    
    let html = ''
    
    // 曜日ラベル
    const weekLabels = ['日', '月', '火', '水', '木', '金', '土']
    weekLabels.forEach(label => {
      html += `<div class="calendar-day-label">${label}</div>`
    })
    
    // 空白セル
    for (let i = 0; i < startWeekday; i++) {
      html += '<div class="calendar-day empty"></div>'
    }
    
    // 日付セル
    const todayStr = formatDate(new Date())
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(new Date(calendarYear, calendarMonth, day))
      const isSelected = selectedDates.has(dateStr)
      const isToday = dateStr === todayStr
      const classes = ['calendar-day']
      if (isSelected) classes.push('selected')
      if (isToday) classes.push('today')
      
      html += `<div class="${classes.join(' ')}" data-date="${dateStr}">${day}</div>`
    }
    
    picker.innerHTML = html
    
    // 日付クリックイベント
    picker.querySelectorAll('.calendar-day:not(.empty)').forEach(dayEl => {
      dayEl.addEventListener('click', () => {
        const dateStr = dayEl.dataset.date
        if (selectedDates.has(dateStr)) {
          selectedDates.delete(dateStr)
          dayEl.classList.remove('selected')
        } else {
          selectedDates.add(dateStr)
          dayEl.classList.add('selected')
        }
        updateSelectedInfo()
      })
    })
  }
  
  function updateSelectedInfo() {
    const info = document.getElementById('selected-dates-info')
    info.textContent = `${selectedDates.size}件選択中`
  }
  
  // カレンダー月移動
  document.getElementById('calendar-prev-month').addEventListener('click', () => {
    calendarMonth--
    if (calendarMonth < 0) {
      calendarMonth = 11
      calendarYear--
    }
    renderCalendarPicker()
  })
  
  document.getElementById('calendar-next-month').addEventListener('click', () => {
    calendarMonth++
    if (calendarMonth > 11) {
      calendarMonth = 0
      calendarYear++
    }
    renderCalendarPicker()
  })
  
  document.getElementById('custom-apply').addEventListener('click', () => {
    // カレンダー選択機能
    if (selectedDates.size === 0) {
      alert('日付を選択してください')
      return
    }
    
    selectedDates.forEach(targetDate => {
      ensureDay(targetDate)
      
      // 同じ名前のエントリーが既に存在するかチェック
      const exists = state[targetDate].slots.some(s => s.name === slot.name)
      
      if (!exists) {
        state[targetDate].slots.push({
          name: slot.name,
          days: '',
          isAuto: false,
        })
      }
    })
    
    saveState()
    render()
    closePopover()
  })
  
  // カレンダーを初期表示
  renderCalendarPicker()
}

function handleInputChange(event) {
  const { date, index, field } = event.target.dataset
  const slotIndex = Number(index)

  ensureDay(date)

  if (field === 'name') {
    const newName = event.target.value.trim()
    
    // 名前の重複チェック
    if (newName && isDuplicateName(date, slotIndex, newName)) {
      const confirmed = confirm(
        `「${newName}」は既にこの日に登録されています。\n重複して登録しますか？`
      )
      if (!confirmed) {
        event.target.value = state[date].slots[slotIndex].name
        return
      }
    }
    
    state[date].slots[slotIndex].name = newName
    // 新規フラグを削除
    delete state[date].slots[slotIndex].isNew
  }

  if (field === 'days') {
    const value = event.target.value.trim()
    const slot = state[date].slots[slotIndex]
    const wasAuto = slot.isAuto
    
    slot.days = value === '' ? '' : Math.max(0, Number(value))
    // 新規フラグを削除
    delete slot.isNew
    
    // 自動エントリーの場合、元の手動エントリーの日数をクリアしてから手動エントリーに変換
    if (wasAuto) {
      // この自動エントリーを生成した元の手動エントリーを探して日数をクリア
      for (const [sourceDate, sourceDayData] of Object.entries(state)) {
        if (sourceDate === date) continue // 同じ日はスキップ
        
        sourceDayData.slots.forEach((sourceSlot) => {
          if (!sourceSlot.isAuto &&
              sourceSlot.name === slot.name &&
              sourceSlot.days !== '') {
            const targetDate = formatDate(addDays(parseDate(sourceDate), Number(sourceSlot.days)))
            if (targetDate === date) {
              // この手動エントリーが現在の自動エントリーを生成していた
              sourceSlot.days = ''
            }
          }
        })
      }
      
      // 元の手動エントリーの日数をクリアした後に、手動エントリーに変換
      slot.isAuto = false
    }
  }

  // 名前または日数が変更された場合は自動エントリーを再構築
  rebuildAutoEntries()
  
  saveState()
  render()
}

// 名前の重複チェック
function isDuplicateName(date, currentSlotIndex, name) {
  if (!state[date]) return false
  
  return state[date].slots.some((slot, index) => {
    return index !== currentSlotIndex && 
           slot.name.toLowerCase() === name.toLowerCase()
  })
}

function ensureDay(date) {
  if (!state[date]) {
    state[date] = {
      slots: [],
    }
  }
}

function createEmptySlot() {
  return {
    name: '',
    days: '',
    isAuto: false,
  }
}

function rebuildAutoEntries() {
  const nextState = {}

  // まず、手動入力のスロットのみをコピー（isNewフラグも保持）
  for (const [date, dayData] of Object.entries(state)) {
    nextState[date] = {
      slots: dayData.slots
        .filter((slot) => !slot.isAuto)
        .map((slot) => ({
          name: slot.name ?? '',
          days: slot.days ?? '',
          isAuto: false,
          ...(slot.isNew && { isNew: true }),
        })),
    }
  }

  // 次に、手動入力のスロットから自動入力を生成
  for (const [date, dayData] of Object.entries(nextState)) {
    dayData.slots.forEach((slot) => {
      // 自動エントリーはスキップ（手動入力のみから生成）
      if (slot.isAuto || !slot.name || slot.days === '') {
        return
      }

      const offset = Number(slot.days)
      if (Number.isNaN(offset) || offset < 0) {
        return
      }

      const targetDate = formatDate(addDays(parseDate(date), offset))
      if (!nextState[targetDate]) {
        nextState[targetDate] = {
          slots: [],
        }
      }

      // 自動入力用の新しいスロットを追加
      nextState[targetDate].slots.push({
        name: slot.name,
        days: '',
        isAuto: true,
      })
    })
  }

  state = nextState
}

function buildCalendar(year, month, data) {
  const firstDay = new Date(year, month, 1)
  const startWeekday = firstDay.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const weekLabels = ['日', '月', '火', '水', '木', '金', '土']

  let html = weekLabels.map((label) => `<div class="weekday">${label}</div>`).join('')

  for (let i = 0; i < startWeekday; i += 1) {
    html += '<div class="day empty"></div>'
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = formatDate(new Date(year, month, day))
    const dayData = data[date] ?? { slots: [] }

    html += `
      <article class="day">
        <div class="day-header">
          <span>${day}</span>
          ${dayData.slots.length > 0 && dayData.slots.some(s => s.name || s.days !== '') ? `<button class="clear-day-btn" data-date="${date}">全削除</button>` : ''}
        </div>
        <div class="entries" data-date="${date}">
          ${dayData.slots
            .map((slot, index) => {
              // 空のスロットは表示しない（ただし新規追加されたものは表示）
              if (!slot.name && slot.days === '' && !slot.isNew) {
                return ''
              }
              const isAuto = slot.isAuto ?? false
              return `
                <div class="entry-row">
                  <input
                    class="name-input"
                    type="text"
                    placeholder="名前"
                    value="${escapeHtml(slot.name)}"
                    data-date="${date}"
                    data-index="${index}"
                    data-field="name"
                    ${isAuto ? 'readonly' : ''}
                  />
                  <input
                    class="days-input"
                    type="number"
                    min="0"
                    placeholder="次回"
                    value="${slot.days}"
                    data-date="${date}"
                    data-index="${index}"
                    data-field="days"
                  />
                  <div class="action-buttons-cell">
                    <button class="custom-btn" data-date="${date}" data-index="${index}" title="カスタム">C</button>
                    <button class="remove-btn" data-date="${date}" data-index="${index}" title="削除">×</button>
                  </div>
                </div>
              `
            })
            .join('')}
        </div>
        <button class="add-entry-btn" data-date="${date}">+</button>
      </article>
    `
  }

  return html
}

async function saveState() {
  if (useServerStorage) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state),
      })
      if (!response.ok) {
        throw new Error('Server save failed')
      }
    } catch (error) {
      console.error('サーバー保存に失敗しました。ローカルストレージに保存します。', error)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return {}
  try {
    const parsed = JSON.parse(saved)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

// 今月のデータ削除機能
function clearMonthData() {
  const confirmed = confirm(`${currentYear}年${currentMonth + 1}月のすべてのデータを削除しますか？\nこの操作は取り消せません。`)
  
  if (!confirmed) {
    return
  }
  
  const year = currentYear
  const month = currentMonth
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  // その月のすべての日付のデータを削除（手動・自動問わず）
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = formatDate(new Date(year, month, day))
    delete state[date]
  }
  
  // rebuildAutoEntries()は呼ばない（他の月のデータに影響を与えないため）
  saveState()
  render()
}

// CSV出力機能
function exportToCSV() {
  const year = currentYear
  const month = currentMonth
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  let csv = '\uFEFF' // BOM for Excel UTF-8 support
  csv += '日付,曜日,患者名,次回来局日数,次回来局予定日\n'
  
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = formatDate(new Date(year, month, day))
    const dayOfWeek = new Date(year, month, day).getDay()
    const dayData = state[date]
    
    if (dayData && dayData.slots) {
      dayData.slots.forEach((slot) => {
        if (slot.name) {
          const nextVisitDate = slot.days !== '' 
            ? formatDate(addDays(parseDate(date), Number(slot.days)))
            : ''
          csv += `${date},${weekdays[dayOfWeek]},"${slot.name}",${slot.days},${nextVisitDate}\n`
        }
      })
    }
  }
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${year}年${month + 1}月.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 印刷機能
function printCalendar() {
  window.print()
}

function addDays(baseDate, days) {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + days)
  return date
}

function parseDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&')
    .replaceAll('<', '<')
    .replaceAll('>', '>')
    .replaceAll('"', '"')
}

// Made with Bob
