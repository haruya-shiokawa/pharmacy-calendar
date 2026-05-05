import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_FILE = path.join(__dirname, 'data', 'calendar-data.json')

app.use(cors())
app.use(express.json())

// データディレクトリの作成
async function ensureDataDir() {
  const dataDir = path.join(__dirname, 'data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

// データの読み込み
async function loadData() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

// データの保存
async function saveData(data) {
  await ensureDataDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

// GET /api/data - データ取得
app.get('/api/data', async (req, res) => {
  try {
    const data = await loadData()
    res.json(data)
  } catch (error) {
    console.error('Error loading data:', error)
    res.status(500).json({ error: 'Failed to load data' })
  }
})

// POST /api/data - データ保存
app.post('/api/data', async (req, res) => {
  try {
    const data = req.body
    await saveData(data)
    res.json({ success: true })
  } catch (error) {
    console.error('Error saving data:', error)
    res.status(500).json({ error: 'Failed to save data' })
  }
})

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

// Made with Bob
