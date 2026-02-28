import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      {/* Navbar chung để điều hướng */}
      <nav style={{ padding: '15px 30px', backgroundColor: '#24292e', color: 'white', display: 'flex', gap: '20px' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>🏠 Trang tra cứu</Link>
        <Link to="/admin" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>⚙️ Quản trị Admin</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
