import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes'
import Layout from './components/layout/Layout'
import useBoardStore from './store/boardStore'
import './App.css'

function AppInit() {
  const fetchBoards = useBoardStore((s) => s.fetchBoards)
  useEffect(() => { fetchBoards() }, [fetchBoards])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInit />
      <Layout>
        <AppRoutes />
      </Layout>
    </BrowserRouter>
  )
}
