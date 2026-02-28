import os
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

@app.post("/api/search")
async def search_legal_info(req: ChatRequest):
    # Lấy API Key DÀNH RIÊNG TỪ FILE .ENV CỦA BACKEND, bỏ qua việc người dùng nhập từ Web Frontend.
    used_api_key = os.getenv("GOOGLE_API_KEY")
    
    if not used_api_key:
        raise HTTPException(status_code=500, detail="Thiếu cấu hình GOOGLE_API_KEY trong file .env của Backend.")
        
    os.environ["GOOGLE_API_KEY"] = used_api_key


    try:
        # Setup models
        embeddings_model = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
        llm = ChatGoogleGenerativeAI(model="models/gemini-flash-latest", temperature=0.3)

        # Retrieval
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

        # Augment & Generate
        template = """
        Bạn là một chuyên gia tư vấn pháp lý. Dựa vào các thông tin sau đây, hãy trả lời câu hỏi của người dùng một cách ngắn gọn, dễ hiểu.
        
        NỘI DUNG LUẬT:
        {law_content}
        
        RỦI RO THỰC TẾ CẦN LƯU Ý:
        {risks}
        
        CÂU HỎI CỦA NGƯỜI DÙNG:
        {question}
        
        Hãy tổng hợp và đưa ra lời khuyên:
        """
        prompt = PromptTemplate.from_template(template)
        
        rag_chain = (
            {
                "law_content": lambda x: match_doc['content'],
                "risks": lambda x: "\n".join(kb_info.get('practical_risks', [])),
                "question": lambda x: req.query
            }
            | prompt
            | llm
            | StrOutputParser()
        )
        
        ai_response = rag_chain.invoke({})

        return {
            "found": True,
            "law_id": match_doc["law_id"],
            "article_num": match_doc["article_num"],
            "content": match_doc["content"],
            "conflicts": kb_info.get("conflicts", []),
            "practical_risks": kb_info.get("practical_risks", []),
            "related_decrees": kb_info.get("related_decrees", []),
            "ai_response": ai_response
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
async def get_all_articles():
    cursor = col_articles.find({}, {"_id": 0, "vector_embedding": 0})
    articles = list(cursor)
    
    # Load knowledge base info for each
    for doc in articles:
        kb_info = col_kb.find_one({"target_article": doc['article_num']}, {"_id": 0})
        doc['kb_info'] = kb_info or {}
        
    return articles

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

