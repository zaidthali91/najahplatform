from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from app.services.llm_engine import llm_engine
from app.services.pdf_processor import analyze_pdf
from pydantic import BaseModel
import uuid

app = FastAPI(title="AI Tutor Service")

class ChatRequest(BaseModel):
    question: str
    subject: str
    user_id: str

class GradeRequest(BaseModel):
    question: str
    answer: str
    subject: str

@app.post("/api/v1/chat")
async def chat(req: ChatRequest):
    if req.subject not in ["INELT", "INCPT", "ARABIC"]:
        raise HTTPException(400, "المادة غير مدعومة")
    return await llm_engine.chat(req.question, req.subject)

@app.post("/api/v1/grade")
async def grade(req: GradeRequest):
    return await llm_engine.grade_open_answer(req.question, req.answer, req.subject)

@app.post("/api/v1/pdf/analyze")
async def pdf_upload(file: UploadFile = File(...), subject: str = "ARABIC"):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "يجب رفع ملف PDF فقط")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "الحجم يتجاوز 10MB")
    return await analyze_pdf(content, subject)