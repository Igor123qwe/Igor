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

async function fetchGoogleSheetData() {
  const SHEET = 'Траты';
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET}`;
  const response = await fetch(url);
  const text = await response.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));
  return json.table.rows
    .map(row => row.c.map(cell => (cell ? cell.v : '')))
    .filter(r => r.length >= 3); // дата, сумма, категория минимум
}

async function fetchCategories() {
  const SHEET = 'Категории';
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET}`;
  const response = await fetch(url);
  const text = await response.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));
  // Берём только значения из первой колонки, начиная со 2 строки
  return json.table.rows.slice(1)
    .map(row => (row.c[0] && typeof row.c[0].v === 'string' ? row.c[0].v.trim() : ''))
    .filter(cat => !!cat);
}

function onlyDate(val) {
  return (val || '').slice(0, 10);
}

function groupByDay(transactions) {
  const map = {};
  transactions.forEach(tx => {
    (map[tx.date] = map[tx.date] || []).push(tx);
  });
  return map;
}

function App() {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(getToday());

  useEffect(() => {
    try {
      WebApp.ready();
    } catch (e) {}
  }, []);

  // Подгружаем категории
  useEffect(() => {
    async function loadCats() {
      try {
        const cats = await fetchCategories();
        setCategories(cats);
      } catch (e) {
        alert('Ошибка загрузки категорий Google Sheets');
      }
    }
    loadCats();
  }, []);

  // Загрузка данных из Google Sheets
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const rows = await fetchGoogleSheetData();
        // [Дата, Сумма, Категория, Описание, ...]
        const txs = rows.slice(1).map(r => ({
          date: onlyDate(r[0]),
          amount: isNaN(Number(r[1])) ? 0 : Number(r[1]),
          // Приводим к строке! даже если null или число — будет ''
          category: typeof r[2] === 'string' ? r[2].trim() : (r[2] ? String(r[2]).trim() : ''),
          note: r[3] || '',
          telegramUserId: r[4] || '',
        })).filter(tx => !!tx.date && tx.amount > 0 && !!tx.category);
        setTransactions(txs);
        // Устанавливаем день
        const dates = txs.map(t => t.date).filter(Boolean);
        setDay(dates.includes(getToday()) ? getToday() : (dates[dates.length - 1] || getToday()));
      } catch (e) {
        alert('Ошибка загрузки данных Google Sheets');
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Группировка по дням
  const daysMap = groupByDay(transactions);
  const days = Object.keys(daysMap).sort().reverse();
  const dailyTx = daysMap[day] || [];

  // Данные для диаграммы (labels и data совпадают по категориям)
  const chartData = {
    labels: categories,
    datasets: [
      {
        data: categories.map(cat =>
          dailyTx
            .filter(tx =>
              (typeof tx.category === 'string' ? tx.category.trim().toLowerCase() : '') === cat.trim().toLowerCase()
            )
            .reduce((sum, tx) => sum + tx.amount, 0)
        ),
        backgroundColor: [
          '#4682B4', '#FFA07A', '#7FFFD4', '#F4A460', '#8A2BE2', '#C0C0C0', '#FFD700', '#90EE90', '#FF6347',
          '#A52A2A', '#DC143C', '#20B2AA', '#FF8C00', '#808000', '#008B8B', '#B8860B', '#9932CC', '#708090'
        ].slice(0, categories.length),
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
      {loading || categories.length === 0
        ? <div>Загрузка...</div>
        : (chartData.datasets[0].data.some(x => x > 0)
            ? <Pie data={chartData} />
            : <div>Нет данных для диаграммы</div>
          )
      }

      <h4>Траты за {day}</h4>
      <ul className="tx-list">
        {dailyTx.length > 0
          ? dailyTx.map((tx, i) => (
              <li key={i}>
                <b>{tx.amount}₽</b> — {tx.category} <i>{tx.note}</i>
              </li>
            ))
          : <li>Нет трат</li>
        }
      </ul>
    </div>
  );
}

export default App;
