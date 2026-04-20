import os
import json
from typing import List, Dict, Optional
from openai import AsyncOpenAI
from app.utils.nlp_arabic import arabic_nlp

class LLMEngine:
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("LLM_API_KEY"),
            base_url=os.getenv("LLM_BASE_URL") # يدعم OpenAI, Groq, Local LLM
        )
        self.system_prompts = {
            "INELT": "You are an expert Iraqi INELT examiner. Focus on grammar patterns, reading comprehension, and vocabulary from the Iraqi high school & university curriculum. Respond in Arabic for explanations, English for examples.",
            "INCPT": "أنت خبير في اختبار الكفاءة الحاسوبية العراقي (INCPT). ركز على Office 2016/2019، Windows 10، أساسيات الشبكات والأمان. اشرح بخطوات عملية واضحة.",
            "ARABIC": "أنت أستاذ لغة عربية متخصص بمناهج الاختبار الوطني العراقي. ركز على النحو التطبيقي، الصرف، الإعراب، الأخطاء الشائعة، والبلاغة. استخدم أمثلة من الأدب العراقي والعربي."
        }

    async def chat(self, question: str, subject: str, language: str = "ar") -> dict:
        prompt = self.system_prompts.get(subject, self.system_prompts["ARABIC"])
        response = await self.client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"{question}\n\nأجب بدقة، مع شرح موجز، مثال تطبيقي، وربط بسؤال وزاري/وطني مشهور."}
            ],
            temperature=0.3,
            max_tokens=800
        )
        return {
            "answer": response.choices[0].message.content,
            "subject": subject,
            "confidence": 0.85,
            "related_topics": self._extract_topics(response.choices[0].message.content)
        }

    async def grade_open_answer(self, question: str, student_answer: str, subject: str) -> dict:
        prompt = f"""
        قم بتصحيح الإجابة التالية وفق معايير التصحيح العراقية الرسمية:
        السؤال: {question}
        إجابة الطالب: {student_answer}
        
        المطلوب:
        1. درجة من 10
        2. نقاط القوة
        3. الأخطاء النحوية/المفهومية
        4. نموذج إجابة مختصر
        أخرج الناتج بصيغة JSON فقط.
        """
        response = await self.client.chat.completions.create(
            model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
            messages=[{"role": "system", "content": "مصحح امتحانات عراقي دقيق. أخرج JSON فقط."},
                      {"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        try:
            return json.loads(response.choices[0].message.content)
        except:
            return {"score": 0, "error": "فشل في تحليل الإجابة"}

    def _extract_topics(self, text: str) -> List[str]:
        # استخراج بسيط للكلمات المفتاحية (يمكن استبداله بـ KeyBERT)
        tokens = arabic_nlp.tokenize(text)
        from collections import Counter
        return [w for w, _ in Counter(tokens).most_common(3)]

llm_engine = LLMEngine()