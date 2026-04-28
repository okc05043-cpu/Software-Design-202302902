const express = require('express');
const router = express.Router();

router.get('/search', async (req, res) => {
  const { type, name } = req.query;
  if (!type || !name) return res.status(400).json({ error: '학교 종류와 이름을 입력하세요.' });

  const key = process.env.NEIS_API_KEY;
  if (!key) return res.status(500).json({ error: 'NEIS API 키가 설정되지 않았습니다.' });

  const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${key}&Type=json&SCHUL_KND_SC_NM=${encodeURIComponent(type)}&SCHUL_NM=${encodeURIComponent(name)}&pSize=10`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    if (!text || !text.trim()) return res.json([]);
    const data = JSON.parse(text);
    const rows = data.schoolInfo?.[1]?.row ?? [];
    res.json(rows);
  } catch {
    res.json([]);
  }
});

module.exports = router;
