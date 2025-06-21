import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import './App.css';
import { Pie } from 'react-chartjs-2';

// Chart.js registration (обязательно для pie chart)
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

function loadTransactions() {
  return JSON.parse(localStorage.getItem('transactions') || '[]');
}

function saveTransactions(transactions) {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

function groupByDay(transactions) {
  const map = {};
  transactions.forEach(tx => {
    (map[tx.date] = map[tx.date] || []).push(tx);
  });
  return map;
}

const categories = ['Еда', 'Транспорт', 'Квартира', 'Здоровье', 'Одежда', 'Другое'];

function App() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getToday());
  const [transactions, setTransactions] = useState(loadTransactions());
  const [day, setDay] = useState(getToday());

  // Telegram mini app ready!
  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.MainButton.setParams({
        text: 'Добавить',
        is_visible: true,
        is_active: true,
      });
      WebApp.MainButton.onClick(() => {
        handleAddTx();
      });
    } catch (e) {
      // не в Telegram
    }
    // eslint-disable-next-line
  }, [amount, category, note, date]);

  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

  const daysMap = groupByDay(transactions);
  const days = Object.keys(daysMap).sort().reverse();

  const dailyTx = daysMap[day] || [];

  // Статистика по категориям
  const chartData = {
    labels: categories,
    datasets: [
      {
        data: categories.map(cat =>
          dailyTx.filter(tx => tx.category === cat).reduce((sum, tx) => sum + +tx.amount, 0)
        ),
        backgroundColor: [
          '#4682B4', '#FFA07A', '#7FFFD4', '#F4A460', '#8A2BE2', '#C0C0C0'
        ],
      },
    ],
  };

  function handleAddTx(e) {
    if (e) e.preventDefault();
    if (!amount || isNaN(amount)) return;
    const tx = { amount, category, note, date };
    setTransactions([...transactions, tx]);
    setAmount('');
    setNote('');
  }

  // Если приложение не в Telegram, просто показываем обычную кнопку
  const isTelegram = window?.Telegram?.WebApp !== undefined || !!window.twa;

  return (
    <div className="App">
      <h2>Финансы в Telegram</h2>

      <form onSubmit={handleAddTx} className="form">
        <input
          type="number"
          placeholder="Сумма"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
        />
        <select value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(cat => <option key={cat}>{cat}</option>)}
        </select>
        <input
          type="text"
          placeholder="Комментарий"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          max={getToday()}
        />
        {!isTelegram && (
          <button type="submit">Добавить</button>
        )}
      </form>

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
      <Pie data={chartData} />

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
