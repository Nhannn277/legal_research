import os
import re
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from dotenv import load_dotenv

from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Load biến môi trường
load_dotenv()

app = FastAPI(title="Legal Advisor API")

# Cấu hình CORS để React (chạy port khác) có thể gọi API này
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Trong production nên đổi thành domain cụ thể
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kết nối MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["LegalAdvisorDB"]
col_articles = db["articles"]
col_kb = db["knowledge_base"]

def find_exact_match(query_text):
    """
    Tìm kiếm chính xác số hiệu điều luật nếu người dùng nhập cụ thể.
    Ví dụ: 'Điều 127', 'cho tôi hỏi điều 127' -> Tìm 'Điều 127'
    """
    query_text = query_text.strip()
    
    # Regex bắt pattern "Điều X" (case-insensitive)
    match = re.search(r'(điều\s+\d+\w*)', query_text, re.IGNORECASE)
    
    if match:
        article_ref = match.group(0) # e.g. "Điều 127"
        # Chuẩn hóa khoảng trắng thừa
        article_ref = re.sub(r'\s+', ' ', article_ref).strip()

        # Tìm chính xác trong DB (case-insensitive)
        doc = col_articles.find_one({
            "article_num": {"$regex": f"^{re.escape(article_ref)}$", "$options": "i"},
            "content": {"$exists": True} # Đảm bảo có nội dung
        })
        
        if doc:
            return doc

    return None

class ChatRequest(BaseModel):
    query: str
    api_key: str = "" # React sẽ gửi kèm key nếu có

def find_best_match(query_text, embedding_model):
    try:
        query_vector = embedding_model.embed_query(query_text)
        
        # Pull vectors from DB
        cursor = col_articles.find({}, {"vector_embedding": 1, "article_num": 1, "content": 1, "law_id": 1})
        docs = list(cursor)
        
        best_score = -1
        best_doc = None

        for doc in docs:
            db_vector = doc['vector_embedding']
            score = np.dot(query_vector, db_vector) / (np.linalg.norm(query_vector) * np.linalg.norm(db_vector))
            
            if score > best_score:
                best_score = score
                best_doc = doc
        
        # Hạ ngưỡng xuống 0.5 (Do model gemini-embedding-001 tính khoảng cách bằng cosine hơi chặt)
        if best_score > 0.5:
            return best_doc
        return None
    except Exception as e:
        print(f"Vector search error: {e}")
        return None


class ExplainRequest(BaseModel):
    query: str
    law_content: str
    practical_risks: list = []

@app.post("/api/explain")
async def explain_legal_info(req: ExplainRequest):
    used_api_key = os.getenv("GOOGLE_API_KEY")
    if not used_api_key:
        raise HTTPException(status_code=500, detail="Thiếu cấu hình GOOGLE_API_KEY trong file .env của Backend.")
    os.environ["GOOGLE_API_KEY"] = used_api_key

    try:
        # Quay lại model ổn định nhất tương thích với thư viện hiện tại
        llm = ChatGoogleGenerativeAI(model="models/gemini-flash-latest", temperature=0.3)

        template = """
        Bạn là một chuyên gia tư vấn pháp lý. Dựa vào các thông tin sau đây, hãy trả lời câu hỏi của người dùng theo đúng định dạng sau:
        "Tóm tắt ngắn gọn: điều luật này sẽ ...., nhưng....., bạn nên......."

        NỘI DUNG LUẬT:
        {law_content}
        
        RỦI RO THỰC TẾ CẦN LƯU Ý:
        {risks}
        
        CÂU HỎI CỦA NGƯỜI DÙNG:
        {question}
        """
        prompt = PromptTemplate.from_template(template)
        
        # Đảm bảo practical_risks là list string
        risks_text = "\n".join([str(r) for r in req.practical_risks]) if req.practical_risks else ""

        rag_chain = (
            {
                "law_content": lambda x: req.law_content,
                "risks": lambda x: risks_text,
                "question": lambda x: req.query
            }
            | prompt
            | llm
            | StrOutputParser()
        )
        
        ai_response = rag_chain.invoke({})
        return {"explanation": ai_response}

    except Exception as e:
        print(f"Error in /api/explain: {e}") # Log lỗi ra terminal để debug
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/search")
async def search_legal_info(req: ChatRequest):
    # Lấy API Key DÀNH RIÊNG TỪ FILE .ENV CỦA BACKEND, bỏ qua việc người dùng nhập từ Web Frontend.
    used_api_key = os.getenv("GOOGLE_API_KEY")
    
    if not used_api_key:
        raise HTTPException(status_code=500, detail="Thiếu cấu hình GOOGLE_API_KEY trong file .env của Backend.")
        
    os.environ["GOOGLE_API_KEY"] = used_api_key


    try:
        # Setup models (embedding only)
        embeddings_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

        # 1. Ưu tiên tìm chính xác
        match_doc = find_exact_match(req.query)

        # 2. Nếu không có, mới tìm vector
        if not match_doc:
            match_doc = find_best_match(req.query, embeddings_model)

        if not match_doc:
            return {
                "found": False,
                "message": "Không tìm thấy điều luật phù hợp trong cơ sở dữ liệu."
            }

        # Lấy Knowledge Base
        kb_info = col_kb.find_one({"target_article": match_doc['article_num']})
        if not kb_info:
            kb_info = {"conflicts": [], "practical_risks": [], "related_decrees": []}

        return {
            "found": True,
            "law_id": match_doc["law_id"],
            "article_num": match_doc["article_num"],
            "content": match_doc["content"],
            "conflicts": kb_info.get("conflicts", []),
            "practical_risks": kb_info.get("practical_risks", []),
            "related_decrees": kb_info.get("related_decrees", [])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
from typing import List, Optional

class ArticleInput(BaseModel):
    law_id: str
    article_num: str
    content: str
    conflicts: List[str] = []
    practical_risks: List[str] = []
    related_decrees: List[str] = []

@app.get("/api/admin/articles")
async def get_all_articles(page: int = 1, limit: int = 10, search: str = ""):
    query = {}
    if search:
        # Search in article_num or content or law_id
        query = {
            "$or": [
                {"article_num": {"$regex": search, "$options": "i"}},
                {"content": {"$regex": search, "$options": "i"}},
                {"law_id": {"$regex": search, "$options": "i"}}
            ]
        }
    
    total_count = col_articles.count_documents(query)
    
    cursor = col_articles.find(query, {"_id": 0, "vector_embedding": 0})\
        .skip((page - 1) * limit)\
        .limit(limit)
    
    articles = list(cursor)
    
    # Load knowledge base info for each
    for doc in articles:
        kb_info = col_kb.find_one({"target_article": doc['article_num']}, {"_id": 0})
        doc['kb_info'] = kb_info or {}
        
    return {
        "data": articles,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }

@app.post("/api/admin/articles")
async def add_or_update_article(article: ArticleInput):
    used_api_key = os.getenv("GOOGLE_API_KEY")
    if not used_api_key:
        raise HTTPException(status_code=500, detail="Thi?u GOOGLE_API_KEY")
    os.environ["GOOGLE_API_KEY"] = used_api_key
    
    try:
        # Generate new vector embedding
        embeddings_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
        vector = embeddings_model.embed_query(article.content)
        
        # Update or insert article
        col_articles.update_one(
            {"article_num": article.article_num},
            {"$set": {
                "law_id": article.law_id,
                "article_num": article.article_num,
                "content": article.content,
                "vector_embedding": vector
            }},
            upsert=True
        )
        
        # Update or insert knowledge base
        col_kb.update_one(
            {"target_article": article.article_num},
            {"$set": {
                "target_article": article.article_num,
                "conflicts": article.conflicts,
                "practical_risks": article.practical_risks,
                "related_decrees": article.related_decrees
            }},
            upsert=True
        )
        
        return {"status": "success", "message": "Saved successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/articles/{article_num}")
async def delete_article(article_num: str):
    col_articles.delete_one({"article_num": article_num})
    col_kb.delete_one({"target_article": article_num})
    return {"status": "success", "message": "Deleted successfully."}

