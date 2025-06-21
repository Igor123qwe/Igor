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

const categories = ['Еда', 'Транспорт', 'Квартира', 'Здоровье', 'Одежда', 'Другое'];

// --- Функция загрузки данных из Google Sheets ---
async function fetchGoogleSheetData() {
  const SPREADSHEET_ID = '1lZbSlYvCyHmR45Ducd2R5w_gwOaKnJePOW4RKaiGx2E';
  const SHEET = 'Траты';
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET}`;
  const response = await fetch(url);
  const text = await response.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));
  // rows[0] - заголовки
  return json.table.rows
    .map(row => row.c.map(cell => (cell ? cell.v : '')))
    .filter(r => r.length >= 5); // дата, сумма, категория, описание, id
}

function onlyDate(val) {
  // Берём только "2025-06-21"
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
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(getToday());

  useEffect(() => {
    try {
      WebApp.ready();
    } catch (e) {}
  }, []);

  // Загружаем данные из Google Sheets
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const rows = await fetchGoogleSheetData();
        // [Дата, Сумма, Категория, Описание, Telegram User ID]
        const txs = rows.slice(1).map(r => ({
          date: onlyDate(r[0]),
          amount: r[1],
          category: r[2],
          note: r[3],
          telegramUserId: r[4],
        }));
        setTransactions(txs);
        // выставить день на сегодня, если есть такие транзакции, иначе на последний найденный
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

  // Готовим данные для диаграммы
  const chartData = {
    labels: categories,
    datasets: [
      {
        data: categories.map(cat =>
          dailyTx.filter(tx => tx.category.toLowerCase() === cat.toLowerCase()).reduce((sum, tx) => sum + +tx.amount, 0)
        ),
        backgroundColor: [
          '#4682B4', '#FFA07A', '#7FFFD4', '#F4A460', '#8A2BE2', '#C0C0C0'
        ],
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
      {loading ? <div>Загрузка...</div> : <Pie data={chartData} />}

      <h4>Траты за {day}</h4>
      <ul className="tx-list">
        {dailyTx.map((tx, i) => (
          <li key={i}>
            <b>{tx.amount}₽</b> — {tx.category} <i>{tx.note}</i>
          </li>
        ))}
        {dailyTx.length === 0 && <li>Нет трат</li>}
      </ul>
    </div>
  );
}

export default App;
