import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import './layout.css'
import AlphaDetailPage from './pages/AlphaDetailPage'
import AlphaNewPage from './pages/AlphaNewPage'
import AlphasListPage from './pages/AlphasListPage'
import BacktestDetailPage from './pages/BacktestDetailPage'
import BacktestNewPage from './pages/BacktestNewPage'
import BacktestsListPage from './pages/BacktestsListPage'
import DataSummaryPage from './pages/DataSummaryPage'
import HomePage from './pages/HomePage'
import InstrumentDetailPage from './pages/InstrumentDetailPage'
import SearchResultsPage from './pages/SearchResultsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchResultsPage />} />
        <Route path="instruments/:symbol" element={<InstrumentDetailPage />} />
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
