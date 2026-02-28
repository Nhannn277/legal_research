# Hệ Thống Trợ Lý Pháp Lý AI (Legal Advisor API)

Chào mừng bạn! Đây là trang web giúp tra cứu luật, dịch luật và cảnh báo rủi ro tự động sử dụng Trí Tuệ Nhân Tạo (Google Gemini) và lưu trữ dữ liệu tại MongoDB.

Dưới đây là hướng dẫn **cực kỳ đơn giản** để ai cũng có thể tự chạy được phần mềm này trên máy của mình.

---

##  Những thứ cần cài đặt trước (Chỉ làm 1 lần duy nhất)

Để máy tính hiểu được mã nguồn và chạy được trang web, bạn cần cài đặt 2 phần mềm nền tảng sau (cứ tải bản mặc định và Next/Cài đặt như phần mềm bình thường):

1. **Python** (Để chạy lõi Trí tuệ Nhân tạo):
   - Vào Tải tại đây: [Tải Python về máy](https://www.python.org/downloads/)
   - ** QUAN TRỌNG:** Khi cài đặt Python, ở màn hình đầu tiên, HÃY NHỚ TÍCH VÀO ô **"Add Python to PATH"** (hoặc "Add python.exe to PATH") ở góc dưới màn hình cài đặt. Sau đó mới nhấn "Install Now".

2. **Node.js** (Để chạy giao diện trang Web):
   - Tải bản có chữ "LTS" (Bản ổn định) tại đây: [Tải Node.js về máy](https://nodejs.org/en/) (cài đặt cứ ấn Next liên tục là xong).

---

##  Hướng dẫn khởi chạy dự án

### Bước 1: Chuẩn bị Chìa khóa (Key) kết nối
Hệ thống cần tài khoản kết nối với Trí Tuệ nhân tạo và Cơ sở dữ liệu.
1. Bạn hãy sao chép (copy) file có tên là .env.example và dán ra một bản mới, sau đó đổi tên file mới thành **.env** (chính xác là .env nhé, không có đuôi .txt đâu).
2. Mở file .env bằng Notepad hoặc bất kỳ trình soạn thảo nào, và điền thông tin của bạn vào (thay cho dòng chữ hướng dẫn):
   - GOOGLE_API_KEY: Lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey).
   - MONGO_URI: Lấy tại trang chủ [MongoDB Atlas](https://www.mongodb.com/). 

### Bước 2: Chạy bộ não AI (Backend)
1. Mở thư mục chứa source code này lên (thư mục legal_research).
2. Mở phần mềm **Terminal** hoặc **Command Prompt (CMD)**, hoặc chuột phải vào vùng trống trong thư mục chọn "Open in Terminal".
3. Lần lượt gõ (hoặc copy) 3 lệnh sau vào bảng đen và ấn Enter:

   **Tạo môi trường ảo (giúp máy tính gọn gàng):**
   \\\cmd
   python -m venv .venv
   \\\

   **Bật môi trường ảo lên:**
   \\\cmd
   .venv\Scripts\activate
   \\\
   *(Nếu bạn dùng máy tính Mac/Linux thì gõ lệnh này thay thế: source .venv/bin/activate)*

   **Cài đặt các gói thư viện AI cần thiết:**
   \\\cmd
   pip install -r requirements.txt
   \\\

   **Cuối cùng, Khởi động Backend (Máy chủ lõi):**
   \\\cmd
   uvicorn api:app --reload
   \\\
   *(Bạn cứ để cửa sổ đen này chạy, ĐỪNG TẮT NÀY ĐI NHÉ!)*

### Bước 3: Chạy Giao diện người dùng (Frontend)
1. Mở thêm 1 cửa sổ **Terminal / CMD** thứ 2 (Song song với cái bảng đen ở bước trên đang chạy nhé).
2. Gõ lệnh để đi vào thư mục giao diện:
   \\\cmd
   cd frontend
   \\\

3. Cài đặt các gói giao diện Web (Chỉ cần gõ 1 lần đầu tiên):
   \\\cmd
   npm install
   \\\

4. Chạy lên trang web:
   \\\cmd
   npm run dev
   \\\

---

##  Hoàn tất!
Bây giờ, trên cửa sổ Terminal thứ 2 bạn sẽ thấy một dòng chữ ghi là http://localhost:5173/.
Bạn hãy **bấm giữ nút Ctrl + Click chuột trái** vào đường link đó (hoặc copy nó dán lên trình duyệt Chrome/Cốc Cốc).

- **Trang chủ tra cứu:** http://localhost:5173/
- **Trang Quản trị (Để tự thêm luật vào Đám mây):** http://localhost:5173/admin

Chúc bạn sử dụng phần mềm và quản lý dữ liệu pháp lý một cách hiệu quả!
