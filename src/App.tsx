import { NavLink, Outlet, Route, Routes } from 'react-router-dom'
import './layout.css'
import AlphaDetailPage from './pages/AlphaDetailPage'
import AlphaNewPage from './pages/AlphaNewPage'
import AlphasListPage from './pages/AlphasListPage'
import BacktestDetailPage from './pages/BacktestDetailPage'
import BacktestNewPage from './pages/BacktestNewPage'
import BacktestsListPage from './pages/BacktestsListPage'
import DataSummaryPage from './pages/DataSummaryPage'
import HomePage from './pages/HomePage'

function Layout() {
  return (
    <div className="app">
      <header className="app-header">
        <nav>
          <span className="app-title">shunya-ui</span>
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/alphas">Alphas</NavLink>
          <NavLink to="/backtests">Backtests</NavLink>
          <NavLink to="/data">Data</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="alphas" element={<AlphasListPage />} />
        <Route path="alphas/new" element={<AlphaNewPage />} />
        <Route path="alphas/:alphaId" element={<AlphaDetailPage />} />
        <Route path="backtests" element={<BacktestsListPage />} />
        <Route path="backtests/new" element={<BacktestNewPage />} />
        <Route path="backtests/:jobId" element={<BacktestDetailPage />} />
        <Route path="data" element={<DataSummaryPage />} />
      </Route>
    </Routes>
  )
}
