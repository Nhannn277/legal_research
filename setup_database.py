import json
import os
from pymongo import MongoClient
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

# Hướng dẫn: Tạo file .env và thêm GOOGLE_API_KEY=... hoặc nhập trực tiếp khi chạy
load_dotenv()

# CẤU HÌNH KẾT NỐI
# Lấy từ biến môi trường (File .env)
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    MONGO_URI = "mongodb://localhost:27017/" # Fallback về Local nếu không tìm thấy key

DB_NAME = "LegalAdvisorDB"
COLLECTION_ARTICLES = "articles"
COLLECTION_KNOWLEDGE = "knowledge_base"

# Bạn cần thay API Key của bạn vào đây nếu chưa có file .env 
# os.environ["GOOGLE_API_KEY"] = "YOUR_API_KEY_HERE" 

def setup_db():
    try:
        # 1. Kết nối MongoDB
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        
        # Xóa dữ liệu cũ (để demo chạy lại cho sạch)
        db[COLLECTION_ARTICLES].drop()
        db[COLLECTION_KNOWLEDGE].drop()
        
        print("Đã kết nối MongoDB và làm sạch dữ liệu cũ.")

        # 2. Khởi tạo mô hình Embedding (LangChain + Gemini)
        if not os.getenv("GOOGLE_API_KEY"):
            print("LỖI: Chưa có GOOGLE_API_KEY. Vui lòng thiết lập biến môi trường.")
            return

        embeddings_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

        # 3. Đọc dữ liệu mẫu
        with open('data/legal_data.json', 'r', encoding='utf-8') as f:
            raw_data = json.load(f)

        articles_data = []
        knowledge_data = []

        print("Đang xử lý dữ liệu và tạo Vector Embedding...")

        for item in raw_data:
            # Tạo vector từ nội dung luật
            vector = embeddings_model.embed_query(item['content'])
            
            # Chuẩn bị data cho collection Articles
            article_doc = {
                "law_id": item['law_id'],
                "article_num": item['article_num'],
                "content": item['content'],
                "vector_embedding": vector
            }
            articles_data.append(article_doc)

            # Chuẩn bị data cho collection Knowledge Base
            kb_doc = {
                "target_article": item['article_num'], # Link bằng số điều
                "conflicts": item['knowledge_base']['conflicts'],
                "practical_risks": item['knowledge_base']['practical_risks'],
                "related_decrees": item['knowledge_base']['related_decrees']
            }
            knowledge_data.append(kb_doc)

        # 4. Insert vào MongoDB
        if articles_data:
            db[COLLECTION_ARTICLES].insert_many(articles_data)
            print(f"Đã thêm {len(articles_data)} bản ghi vào '{COLLECTION_ARTICLES}'.")
        
        if knowledge_data:
            db[COLLECTION_KNOWLEDGE].insert_many(knowledge_data)
            print(f"Đã thêm {len(knowledge_data)} bản ghi vào '{COLLECTION_KNOWLEDGE}'.")

        print("=== HOÀN TẤT CÀI ĐẶT CƠ SỞ DỮ LIỆU ===")

    except Exception as e:
        print(f"Có lỗi xảy ra: {e}")

if __name__ == "__main__":
    setup_db()