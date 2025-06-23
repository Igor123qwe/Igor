import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import './App.css';
import { Pie } from 'react-chartjs-2';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

function getToday() {
  return new Date().toISOString().split('T')[0];
}

const SPREADSHEET_ID = '1lZbSlYvCyHmR45Ducd2R5w_gwOaKnJePOW4RKaiGx2E';

// Получаем категории из листа "Категории"
async function fetchCategories() {
  const SHEET = 'Категории';
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET}`;
  const response = await fetch(url);
  const text = await response.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));
  return json.table.rows.slice(1)
    .map(row => (row.c[0] && typeof row.c[0].v === 'string' ? row.c[0].v.trim() : ''))
    .filter(cat => !!cat);
}

// Получаем траты из листа "Траты"
async function fetchGoogleSheetData() {
  const SHEET = 'Траты';
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET}`;
  const response = await fetch(url);
  const text = await response.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));
  return json.table.rows
    .map(row => row.c.map(cell => cell ? (cell.v !== undefined ? cell.v : cell) : ''))
    .filter(r => r.length >= 3);
}

function parseCellDate(cell) {
  if (!cell) return '';
  if (typeof cell === 'string') return cell.slice(0, 10);
  if (typeof cell === 'object' && cell.f) return cell.f.split(' ')[0].split('.').reverse().join('-');
  if (typeof cell === 'object' && cell.v && typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
    const arr = cell.v.match(/\d+/g);
    if (!arr) return '';
    const year = arr[0], month = String(Number(arr[1]) + 1).padStart(2, '0'), day = String(arr[2]).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '';
}

function groupByDay(transactions) {
  const map = {};
  transactions.forEach(tx => {
    (map[tx.date] = map[tx.date] || []).push(tx);
  });
  return map;
}

// Цвета для диаграммы (дополняй по желанию)
const PALETTE = [
  '#4682B4', '#FFA07A', '#7FFFD4', '#F4A460', '#8A2BE2', '#C0C0C0', '#FFD700', '#90EE90', '#FF6347',
  '#A52A2A', '#DC143C', '#20B2AA', '#FF8C00', '#808000', '#008B8B', '#B8860B', '#9932CC', '#708090'
];

function App() {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(getToday());

  // Запуск Telegram WebApp
  useEffect(() => { try { WebApp.ready(); } catch (e) {} }, []);

  // Загрузка категорий (один раз)
  useEffect(() => {
    async function loadCats() {
      const cats = await fetchCategories();
      setCategories(cats);
    }
    loadCats();
  }, []);

  // Загрузка и обновление транзакций
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const rows = await fetchGoogleSheetData();
        // Индексы: 0 — дата, 1 — сумма, 2 — категория, 3 — user_id
        const txs = rows.slice(1).map(r => ({
          date: parseCellDate(r[0]),
          amount: isNaN(Number(r[1])) ? 0 : Number(r[1]),
          category: (r[2] || '').toString().trim(),
          telegramUserId: r[3] || '',
        })).filter(tx => !!tx.date && tx.amount > 0 && !!tx.category);
        setTransactions(txs);

        // Автоматически показываем сегодня, если есть траты сегодня — иначе последний день с тратами
        const dates = txs.map(t => t.date).filter(Boolean);
        const today = getToday();
        setDay(dates.includes(today) ? today : (dates[dates.length - 1] || today));
      } catch (e) {
        alert('Ошибка загрузки данных Google Sheets');
      }
      setLoading(false);
    }
    loadData();
    // Автообновление раз в 1 минуту (по желанию)
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const daysMap = groupByDay(transactions);
  const days = Object.keys(daysMap).sort().reverse();
  const dailyTx = daysMap[day] || [];

  // Только ненулевые категории для диаграммы
  const activeCategories = categories.filter(cat =>
    dailyTx.some(tx => tx.category.trim().toLowerCase() === cat.trim().toLowerCase())
  );
  const dataForChart = activeCategories.map(cat =>
    dailyTx.filter(tx => tx.category.trim().toLowerCase() === cat.trim().toLowerCase())
      .reduce((sum, tx) => sum + tx.amount, 0)
  );

  const chartData = {
    labels: activeCategories,
    datasets: [
      {
        data: dataForChart,
        backgroundColor: PALETTE.slice(0, activeCategories.length),
      },
    ],
  };

  return (
    <div className="App">
      <h2>Финансы в Telegram</h2>
      <div className="days-scroll">
        {days.map(d => (
          <button
            key={d}
            className={d === day ? 'active' : ''}
            onClick={() => setDay(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <h4>Диаграмма за {day}</h4>
      {loading
        ? <div>Загрузка...</div>
        : (activeCategories.length > 0
            ? <Pie data={chartData} />
            : <div>Нет данных для диаграммы</div>
          )
      }

      <h4>Траты за {day}</h4>
      <ul className="tx-list">
        {dailyTx.length > 0
          ? dailyTx.map((tx, i) => (
              <li key={i}>
                <b>{tx.amount}₽</b> — {tx.category}
              </li>
            ))
          : <li>Нет трат</li>
        }
      </ul>
    </div>
  );
}

export default App;
