import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Vercelの一時ディレクトリを使用
const DATA_FILE = '/tmp/calendar-data.json';

export default function handler(req, res) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエストへの対応
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // データを読み込む
    try {
      if (existsSync(DATA_FILE)) {
        const data = readFileSync(DATA_FILE, 'utf-8');
        res.status(200).json(JSON.parse(data));
      } else {
        res.status(200).json({});
      }
    } catch (error) {
      console.error('Error reading data:', error);
      res.status(200).json({});
    }
  } else if (req.method === 'POST') {
    // データを保存する
    try {
      const data = req.body;
      writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error writing data:', error);
      res.status(500).json({ error: 'Failed to save data' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Made with Bob
