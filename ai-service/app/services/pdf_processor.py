import fitz  # PyMuPDF
from app.services.llm_engine import llm_engine
import io

async def analyze_pdf(file_bytes: bytes, subject: str, max_pages: int = 15) -> dict:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for i in range(min(len(doc), max_pages)):
        text += doc[i].get_text("text") + "\n"
    
    if len(text) < 200:
        return {"error": "النص المستخرج قصير جداً أو الملف ممسوح ضوئياً"}
        
    # توليد ملخص + 5 أسئلة اختيار من متعدد
    prompt = f"""
    لخص هذا النص التعليمي (خاص بـ {subject}) في 3 نقاط أساسية.
    ثم أنشئ 5 أسئلة MCQ بنفس نمط الاختبار الوطني العراقي مع الإجابة الصحيحة والشرح.
    أخرج الناتج بصيغة JSON:
    {{"summary": "...", "questions": [{{"q": "...", "options": ["A", "B", "C", "D"], "correct": 0, "explanation": "..."}}]}}
    """
    result = await llm_engine.client.chat.completions.create(
        model=os.getenv("LLM_MODEL"),
        messages=[{"role": "user", "content": prompt + "\n\nالنص:\n" + text[:3000]}],
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    return json.loads(result.choices[0].message.content)