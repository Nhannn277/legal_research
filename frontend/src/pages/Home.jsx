import React, { useState } from 'react'
import axios from 'axios'

function Home() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [activeTab, setActiveTab] = useState('luat-goc')

  const handleSearch = async (text) => {
    const searchText = text || query
    if (!searchText) return
    
    setQuery(searchText)
    setLoading(true)
    setError('')
    setResult(null)
    setActiveTab('luat-goc')

    try {
      // Gọi lên Backend FastAPI
      const response = await axios.post('http://localhost:8000/api/search', {
        query: searchText
      })

      if (response.data.found) {
        setResult(response.data)
      } else {
        setError(response.data.message)
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail)
      } else {
        setError("Có lỗi xảy ra khi kết nối. Vui lòng kiểm tra lại Backend hoặc API Key.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      {/* Main Content */}
      <div className="main-content">
        <div className="header" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 10 }}>⚖️</div>
          <h1>Hệ Thống Trợ Lý Pháp Lý AI</h1>
        </div>

        <div className="search-box">
          <input
            style={{ width: '100%', padding: '14px 18px', fontSize: 16, borderRadius: 8, border: '1px solid #d1d5da', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            value={query}
            placeholder="Nhập điều luật, từ khóa pháp lý..."
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-btn" onClick={() => handleSearch(query)} disabled={loading}>
            {loading ? "Đang xử lý..." : "🔍 Tra cứu"}
          </button>
        </div>

        {/* Màn hình giới thiệu ban đầu khi chưa có kết quả */}
        {!result && !loading && !error && (
          <div className="intro-container">
            <p className="intro-desc">
              Hệ thống hỗ trợ tra cứu luật thông minh. Tự động trích xuất luật gốc, kiểm tra văn bản chồng chéo và đánh giá rủi ro pháp lý thực tiễn.
            </p>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        {loading && <div className="loading">Đang truy xuất dữ liệu & Phân tích🚀</div>}

        {result && !loading && (
          <div className="result-container">
            <div className="tabs-header">
              <button 
                className={`tab-btn ${activeTab === 'luat-goc' ? 'active' : ''}`}
                onClick={() => setActiveTab('luat-goc')}>
                📜 Luật Gốc
              </button>
              <button 
                className={`tab-btn ${activeTab === 'mau-thuan' ? 'active' : ''}`}
                onClick={() => setActiveTab('mau-thuan')}>
                ⚔️ Mâu Thuẫn & LQ
              </button>
              <button 
                className={`tab-btn ${activeTab === 'rui-ro' ? 'active' : ''}`}
                onClick={() => setActiveTab('rui-ro')}>
                ⚠️ Rủi Ro Thực Tế
              </button>
              <button 
                className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
                onClick={() => setActiveTab('ai')}>
                🤖 AI Trợ Lý
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'luat-goc' && (
                <div>
                  <h3>{result.article_num} ({result.law_id})</h3>
                  <div style={{ backgroundColor: '#f0f8ff', padding: 16, borderRadius: 6, whiteSpace: 'pre-line' }}>
                    {result.content}
                  </div>
                </div>
              )}

              {activeTab === 'mau-thuan' && (
                <div>
                  <h3>Văn bản chồng chéo & Liên quan</h3>
                  {result.conflicts && result.conflicts.length > 0 ? (
                    result.conflicts.map((c, i) => (
                      <div key={i} style={{ backgroundColor: '#fff3cd', padding: 12, borderLeft: '4px solid #ffc107', margin: '8px 0' }}>
                        <strong>Chồng chéo:</strong> {c}
                      </div>
                    ))
                  ) : (
                    <p>Chưa ghi nhận mâu thuẫn lớn.</p>
                  )}
                  
                  <hr style={{ margin: '20px 0', border: 'none', borderBottom: '1px solid #ddd' }} />
                  <h4>Văn bản hướng dẫn:</h4>
                  <ul>
                    {result.related_decrees && result.related_decrees.map((d, i) => (
                      <li key={i} style={{ margin: '8px 0' }}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'rui-ro' && (
                <div>
                  <h3>Cảnh báo rủi ro thực tiễn</h3>
                  {result.practical_risks && result.practical_risks.length > 0 ? (
                    result.practical_risks.map((r, i) => (
                      <div key={i} className="alert-box">
                        ⚠️ <strong>Rủi ro:</strong> {r}
                      </div>
                    ))
                  ) : (
                    <p>Không có dữ liệu rủi ro.</p>
                  )}
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="ai-box">
                  <h3 style={{ color: '#0366d6' }}>🤖 AI Giải Thích:</h3>
                  <div style={{ whiteSpace: 'pre-line' }}>
                    {result.ai_response}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
