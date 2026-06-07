import { useState, useEffect, useCallback } from 'react';
import { Utensils, Plus, Search, TrendingUp, X, Trash2 } from 'lucide-react';
import useHealthStore from '../store/healthStore';
import * as api from '../api/client';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

export default function FoodLogPage() {
  const { foodLog, foodSummary, foodTrends, fetchFoodLog, fetchFoodTrends, showToast } = useHealthStore();
  const [tab, setTab] = useState('today');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    meal_type: 'lunch',
    food_name: '',
    portion: '',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    fiber_g: '',
  });

  useEffect(() => { fetchFoodLog({ date }); }, [date]);
  useEffect(() => { if (tab === 'trends') fetchFoodTrends(7); }, [tab]);

  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const doSearch = useCallback(debounce(async (q) => {
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const results = await api.searchFoods(q);
      setSearchResults(results);
    } catch { setSearchResults([]); }
  }, 300), []);

  useEffect(() => { doSearch(searchQuery); }, [searchQuery]);

  const selectFood = (food) => {
    setForm({
      ...form,
      food_name: food.name,
      calories: food.calories || '',
      protein_g: food.protein_g || '',
      carbs_g: food.carbs_g || '',
      fat_g: food.fat_g || '',
      fiber_g: food.fiber_g || '',
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.food_name.trim()) return;
    const entry = {
      ...form,
      calories: form.calories ? Number(form.calories) : null,
      protein_g: form.protein_g ? Number(form.protein_g) : null,
      carbs_g: form.carbs_g ? Number(form.carbs_g) : null,
      fat_g: form.fat_g ? Number(form.fat_g) : null,
      fiber_g: form.fiber_g ? Number(form.fiber_g) : null,
    };
    try {
      await api.addFood(entry);
      showToast('Food logged');
      setForm({ ...form, food_name: '', portion: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '' });
      setShowForm(false);
      fetchFoodLog({ date });
    } catch {
      showToast('Failed to log food', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteFood(id);
      showToast('Entry removed');
      fetchFoodLog({ date });
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const summary = foodSummary || {};

  const byMeal = {};
  for (const entry of foodLog) {
    byMeal[entry.meal_type] = byMeal[entry.meal_type] || [];
    byMeal[entry.meal_type].push(entry);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Utensils className="w-6 h-6 text-orange-400" />
            Food & Nutrition
          </h1>
          <p className="text-sm text-slate-400 mt-1">Log meals and track your daily nutrition</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-500 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Log Food
        </button>
      </div>

      <div className="flex gap-1 bg-slate-900 p-1 rounded-lg w-fit">
        {[['today', 'Daily Log'], ['trends', 'Trends']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="relative">
            <label className="block text-xs text-slate-400 mb-1">Search Foods</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                placeholder="Search common foods..." />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg max-h-48 overflow-auto shadow-xl">
                {searchResults.map(f => (
                  <button key={f.name} type="button" onClick={() => selectFood(f)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 flex justify-between">
                    <span>{f.name}</span>
                    <span className="text-slate-500">{f.calories} cal</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Food</label>
              <input value={form.food_name} onChange={e => setForm({ ...form, food_name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                placeholder="e.g. Chicken Breast" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Meal</label>
              <select value={form.meal_type} onChange={e => setForm({ ...form, meal_type: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none">
                {MEAL_TYPES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[['calories', 'Calories', 'kcal'], ['protein_g', 'Protein', 'g'], ['carbs_g', 'Carbs', 'g'], ['fat_g', 'Fat', 'g'], ['fiber_g', 'Fiber', 'g']].map(([key, label, unit]) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label} ({unit})</label>
                <input type="number" step="0.1" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none" />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-500">Add Entry</button>
          </div>
        </form>
      )}

      {tab === 'today' && (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().slice(0, 10)); }}
              className="px-2 py-1 bg-slate-800 text-slate-400 rounded hover:text-white">&larr;</button>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white" />
            <button onClick={() => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d.toISOString().slice(0, 10)); }}
              className="px-2 py-1 bg-slate-800 text-slate-400 rounded hover:text-white">&rarr;</button>
          </div>

          {summary.items > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ['Calories', summary.total_calories, 'kcal', 'text-orange-400'],
                ['Protein', summary.total_protein, 'g', 'text-blue-400'],
                ['Carbs', summary.total_carbs, 'g', 'text-yellow-400'],
                ['Fat', summary.total_fat, 'g', 'text-rose-400'],
                ['Fiber', summary.total_fiber, 'g', 'text-emerald-400'],
              ].map(([label, value, unit, color]) => (
                <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{Math.round(value || 0)}<span className="text-xs text-slate-500 ml-0.5">{unit}</span></p>
                </div>
              ))}
            </div>
          )}

          {foodLog.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Utensils className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No food logged for {date}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {MEAL_TYPES.filter(m => byMeal[m]).map(meal => (
                <div key={meal} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 bg-slate-800/50 flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{MEAL_ICONS[meal]} {meal.charAt(0).toUpperCase() + meal.slice(1)}</span>
                    <span className="text-xs text-slate-500">{Math.round(byMeal[meal].reduce((s, e) => s + (e.calories || 0), 0))} cal</span>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {byMeal[meal].map(entry => (
                      <div key={entry.id} className="px-4 py-2.5 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">{entry.food_name}</p>
                          <div className="flex gap-3 mt-0.5 text-xs text-slate-500">
                            {entry.portion && <span>{entry.portion}</span>}
                            {entry.calories && <span>{entry.calories} cal</span>}
                            {entry.protein_g && <span>{entry.protein_g}g P</span>}
                            {entry.carbs_g && <span>{entry.carbs_g}g C</span>}
                            {entry.fat_g && <span>{entry.fat_g}g F</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDelete(entry.id)} className="text-slate-600 hover:text-red-400 p-1 ml-2">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'trends' && (
        <div>
          {!foodTrends || foodTrends.trend?.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Log food for a few days to see trends.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  ['Avg Calories', foodTrends.averages?.avg_calories, 'kcal', 'text-orange-400'],
                  ['Avg Protein', foodTrends.averages?.avg_protein, 'g', 'text-blue-400'],
                  ['Avg Carbs', foodTrends.averages?.avg_carbs, 'g', 'text-yellow-400'],
                  ['Avg Fat', foodTrends.averages?.avg_fat, 'g', 'text-rose-400'],
                  ['Days Logged', foodTrends.averages?.days_logged, '', 'text-emerald-400'],
                ].map(([label, value, unit, color]) => (
                  <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{Math.round(value || 0)}<span className="text-xs text-slate-500 ml-0.5">{unit}</span></p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Daily Calorie Trend
                </h3>
                <div className="flex items-end gap-1 h-32">
                  {foodTrends.trend.map((d, i) => {
                    const maxCal = Math.max(...foodTrends.trend.map(t => t.total_calories || 0));
                    const pct = maxCal > 0 ? ((d.total_calories || 0) / maxCal) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-slate-500">{Math.round(d.total_calories || 0)}</span>
                        <div className="w-full bg-orange-500/80 rounded-t" style={{ height: `${pct}%`, minHeight: '2px' }} />
                        <span className="text-xs text-slate-600">{d.date?.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
