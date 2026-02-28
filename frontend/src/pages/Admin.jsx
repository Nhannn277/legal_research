import React, { useState, useEffect } from 'react'
import axios from 'axios'

function Admin() {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

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
    
    // Scroll lên top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (article_num) => {
    if (!window.confirm(`Bạn có chắc muốn xoá ${article_num}?`)) return
    
    try {
      setLoading(true)
      await axios.delete(`http://localhost:8000/api/admin/articles/${article_num}`)
      setStatusMsg("Đã xoá thành công!")
      fetchArticles()
    } catch (error) {
      console.error(error)
      setStatusMsg("Lỗi khi xoá.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.law_id || !form.article_num || !form.content) {
      setStatusMsg("Vui lòng điền đủ thông tin bắt buộc: ID Luật, Số Điều, Nội dung.")
      return
    }

    try {
      setLoading(true)
      setStatusMsg("Đang lưu và tạo Vector Embedding...")

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
      resetForm()
      fetchArticles()
    } catch (error) {
      console.error(error)
      setStatusMsg("Có lỗi xảy ra khi lưu. Vui lòng thử lại.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>⚙️ Quản Trị Hệ Thống Luật</h1>
      
      {/* Form Thêm/Sửa */}
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
        <h2>{isEditing ? "Chỉnh sửa Điều Luật" : "Thêm Điều Luật Mới"}</h2>
        {statusMsg && (
          <div style={{ padding: '12px', marginBottom: '16px', backgroundColor: '#e1ecf4', border: '1px solid #105bd8', borderRadius: '6px', color: '#105bd8' }}>
            {statusMsg}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Mã Luật (VD: Luật Đất đai 2024)</label>
              <input 
                name="law_id" value={form.law_id} onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Số Điều (VD: Điều 127)</label>
              <input 
                name="article_num" value={form.article_num} onChange={handleInputChange} disabled={isEditing}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: isEditing ? '#f5f5f5' : 'white' }} 
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Nội dung chi tiết luật</label>
            <textarea 
              name="content" value={form.content} onChange={handleInputChange} rows="5"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
            ></textarea>
          </div>

          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px dashed #ddd' }}/>
          <h3 style={{ marginBottom: '16px', color: '#0366d6' }}>Tri thức bổ sung (Knowledge Base)</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
            *Nhập các ý ngăn cách nhau bởi dấu chấm phẩy (;). Ví dụ: Rủi ro A; Rủi ro B
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Mâu thuẫn & Chồng chéo</label>
            <textarea 
              name="conflicts" value={kbForm.conflicts} onChange={handleKbChange} rows="2"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
            ></textarea>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Rủi ro thực tiễn (Cảnh báo)</label>
            <textarea 
              name="practical_risks" value={kbForm.practical_risks} onChange={handleKbChange} rows="2"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
            ></textarea>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Văn bản hướng dẫn liên quan</label>
            <textarea 
              name="related_decrees" value={kbForm.related_decrees} onChange={handleKbChange} rows="2"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
            ></textarea>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button type="submit" disabled={loading} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
              {loading ? "Đang xử lý..." : isEditing ? "💾 Cập nhật Điều Luật" : "➕ Thêm Điều Luật"}
            </button>
            
            {isEditing && (
              <button type="button" onClick={resetForm} style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Hủy Bỏ Sửa
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Danh sách */}
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2>Danh sách các Điều Luật trong cơ sở dữ liệu</h2>
        
        {loading && articles.length === 0 ? <p>Đang tải dữ liệu...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f6f8fa', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Số Điều</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Mã Luật</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Nội dung tóm tắt</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e1e4e8' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold', width: '120px' }}>{item.article_num}</td>
                  <td style={{ padding: '12px', width: '180px' }}>{item.law_id}</td>
                  <td style={{ padding: '12px', color: '#555' }}>
                    {item.content.length > 80 ? item.content.substring(0, 80) + '...' : item.content}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center', width: '150px' }}>
                    <button onClick={() => handleEdit(item)} style={{ backgroundColor: '#0366d6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px' }}>Sửa</button>
                    <button onClick={() => handleDelete(item.article_num)} style={{ backgroundColor: '#d73a49', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}

export default Admin