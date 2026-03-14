import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './Admin.css' // Import CSS mới

function Admin() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [statusType, setStatusType] = useState('success') // 'success' | 'error'

  // Form State
  const [form, setForm] = useState({
    law_id: '',
    article_num: '',
    content: ''
  })
  
  // Knowledge Base State
  const [kbForm, setKbForm] = useState({
    conflicts: '',
    practical_risks: '',
    related_decrees: ''
  })

  // Edit Mode Flag
  const [isEditing, setIsEditing] = useState(false)

  // Fetch Danh sách các điều luật hiện có
  const fetchArticles = async () => {
    try {
      setLoading(true)
      const res = await axios.get('http://localhost:8000/api/admin/articles')
      setArticles(res.data)
    } catch (error) {
      console.error(error)
      setStatusMsg("Lỗi khi tải danh sách điều luật.")
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles()
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  const handleKbChange = (e) => {
    const { name, value } = e.target
    setKbForm({ ...kbForm, [name]: value })
  }

  const resetForm = () => {
    setForm({ law_id: '', article_num: '', content: '' })
    setKbForm({ conflicts: '', practical_risks: '', related_decrees: '' })
    setIsEditing(false)
    setStatusMsg('')
  }

  const handleEdit = (article) => {
    setIsEditing(true)
    setForm({
      law_id: article.law_id,
      article_num: article.article_num,
      content: article.content
    })
    
    // Gộp mảng thành chuỗi cách nhau bởi dấu chấm phẩy và khoảng trắng
    setKbForm({
      conflicts: article.kb_info?.conflicts?.join('; ') || '',
      practical_risks: article.kb_info?.practical_risks?.join('; ') || '',
      related_decrees: article.kb_info?.related_decrees?.join('; ') || ''
    })
    
    setStatusMsg(`Đang chỉnh sửa: ${article.article_num}`)
    setStatusType('success')
    
    // Scroll lên top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (article_num) => {
    if (!window.confirm(`Bạn có chắc muốn xoá ${article_num}?`)) return
    
    try {
      setLoading(true)
      await axios.delete(`http://localhost:8000/api/admin/articles/${article_num}`)
      setStatusMsg("Đã xoá điều luật thành công!")
      setStatusType('success')
      fetchArticles()
    } catch (error) {
      console.error(error)
      setStatusMsg("Lỗi khi xoá dữ liệu.")
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.law_id || !form.article_num || !form.content) {
      setStatusMsg("Vui lòng điền đủ thông tin bắt buộc: ID Luật, Số Điều, Nội dung.")
      setStatusType('error')
      return
    }

    try {
      setLoading(true)
      setStatusMsg("Đang lưu dữ liệu và tạo Vector Embedding...")
      setStatusType('success')

      // Format dữ liệu gửi lên API
      const newArticle = {
        law_id: form.law_id,
        article_num: form.article_num,
        content: form.content,
        // Chuyển chuỗi thành mảng
        conflicts: kbForm.conflicts.split(';').map(s => s.trim()).filter(Boolean),
        practical_risks: kbForm.practical_risks.split(';').map(s => s.trim()).filter(Boolean),
        related_decrees: kbForm.related_decrees.split(';').map(s => s.trim()).filter(Boolean),
      }

      await axios.post('http://localhost:8000/api/admin/articles', newArticle)
      
      setStatusMsg(isEditing ? "Đã cập nhật thành công!" : "Đã thêm mới thành công!")
      setStatusType('success')
      resetForm()
      fetchArticles()
    } catch (error) {
      console.error(error)
      setStatusMsg("Có lỗi xảy ra khi lưu. Vui lòng kiểm tra kết nối Server.")
      setStatusType('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>⚙️ Quản Trị Hệ Thống Luật</h1>
        <a href="/" className="btn-back">← Về Trang Chủ</a>
      </div>

      <div className="admin-grid">
        {/* Cột Trái: Form Thêm/Sửa */}
        <div className="admin-card form-section">
          <h2 className="form-title">{isEditing ? "✏️ Chỉnh sửa Điều Luật" : "➕ Thêm Điều Luật Mới"}</h2>
          
          {statusMsg && (
            <div className={`status-msg ${statusType === 'success' ? 'status-success' : 'status-error'}`}>
              {statusType === 'success' ? '✅' : '⚠️'} {statusMsg}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Mã Luật <span style={{color:'red'}}>*</span></label>
              <input 
                className="form-control"
                name="law_id" 
                value={form.law_id} 
                onChange={handleInputChange}
                placeholder="VD: Luật Đất đai 2024"
              />
            </div>

            <div className="form-group">
              <label>Số Điều <span style={{color:'red'}}>*</span></label>
              <input 
                className="form-control"
                name="article_num" 
                value={form.article_num} 
                onChange={handleInputChange} 
                disabled={isEditing}
                placeholder="VD: Điều 127"
                style={{ backgroundColor: isEditing ? '#f5f5f5' : 'white' }}
              />
            </div>

            <div className="form-group">
              <label>Nội dung chi tiết luật <span style={{color:'red'}}>*</span></label>
              <textarea 
                className="form-control"
                name="content" 
                value={form.content} 
                onChange={handleInputChange} 
                rows="6"
                placeholder="Nhập toàn văn nội dung điều luật..."
              ></textarea>
            </div>

            <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px dashed #ddd' }}/>
            
            <h3 style={{ fontSize: '16px', color: '#0366d6', marginBottom: '12px' }}>
              🧠 Tri thức bổ sung (Knowledge Base)
            </h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px', fontStyle: 'italic' }}>
              *Nhập các ý ngăn cách nhau bởi dấu chấm phẩy (;).
            </p>

            <div className="form-group">
              <label>Mâu thuẫn & Chồng chéo</label>
              <textarea 
                className="form-control"
                name="conflicts" 
                value={kbForm.conflicts} 
                onChange={handleKbChange} 
                rows="2"
                placeholder="VD: Trái với Luật Nhà ở 2014; Mâu thuẫn Nghị định 99"
              ></textarea>
            </div>

            <div className="form-group">
              <label>Rủi ro thực tiễn (Cảnh báo)</label>
              <textarea 
                className="form-control"
                name="practical_risks" 
                value={kbForm.practical_risks} 
                onChange={handleKbChange} 
                rows="2"
                placeholder="VD: Khó áp dụng nếu không có xác nhận của UBND"
              ></textarea>
            </div>

            <div className="form-group">
              <label>Văn bản hướng dẫn liên quan</label>
              <textarea 
                className="form-control"
                name="related_decrees" 
                value={kbForm.related_decrees} 
                onChange={handleKbChange} 
                rows="2"
                placeholder="VD: Nghị định 43/2014/NĐ-CP; Thông tư 02"
              ></textarea>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Đang xử lý..." : isEditing ? "Lưu Cập Nhật" : "Lưu Điều Luật"}
              </button>
              
              {isEditing && (
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Hủy Bỏ
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Cột Phải: Danh sách */}
        <div className="admin-card list-section">
          <h2 className="form-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>📂 Cơ Sở Dữ Liệu Luật</span>
            <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#666' }}>
              (Tổng: {articles.length})
            </span>
          </h2>
          
          <div className="table-container">
            {loading && articles.length === 0 ? (
              <div className="empty-state">⏳ Đang tải dữ liệu...</div>
            ) : articles.length === 0 ? (
              <div className="empty-state">📭 Chưa có dữ liệu nào. Hãy thêm mới!</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '15%' }}>Số Điều</th>
                    <th style={{ width: '25%' }}>Mã Luật</th>
                    <th style={{ width: '40%' }}>Nội dung tóm tắt</th>
                    <th style={{ width: '20%', textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((item, idx) => (
                    <tr key={idx}>
                      <td className="article-meta">{item.article_num}</td>
                      <td>{item.law_id}</td>
                      <td style={{ color: '#555' }}>
                        {item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content}
                      </td>
                      <td>
                        <div className="action-buttons" style={{ justifyContent: 'center' }}>
                          <button 
                            className="btn-icon btn-edit"
                            title="Chỉnh sửa"
                            onClick={() => handleEdit(item)}
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-icon btn-delete" 
                            title="Xoá"
                            onClick={() => handleDelete(item.article_num)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin