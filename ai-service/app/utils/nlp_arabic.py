import re
import unicodedata
from camel_tools.tokenizers.word import simple_word_tokenize
from camel_tools.morphology.database import MorphologyDB
from camel_tools.disambig.mle import MLEDisambiguator
from camel_tools.utils.dediac import dediac

class ArabicNLP:
    def __init__(self):
        self.db = MorphologyDB.builtin_db()
        self.disamb = MLEDisambiguator(self.db)
        
    def normalize_text(self, text: str) -> str:
        """تنظيف وتوحيد النص العربي"""
        text = re.sub(r'[أإآٱ]', 'ا', text)
        text = re.sub(r'ة', 'ه', text)
        text = re.sub(r'ى', 'ي', text)
        text = re.sub(r'[ًٌٍَُِّْٰ]', '', text) # إزالة التشكيل
        text = unicodedata.normalize('NFKC', text)
        return re.sub(r'\s+', ' ', text).strip()
        
    def tokenize(self, text: str) -> list:
        """تقسيم النص إلى كلمات مع تجاهل أدوات الربط"""
        stop_words = {'و', 'أو', 'في', 'من', 'إلى', 'على', 'عن', 'هو', 'هي', 'هو', 'ما', 'لا', 'لم', 'لن', 'قد', 'إن', 'أن'}
        tokens = simple_word_tokenize(self.normalize_text(text))
        return [t for t in tokens if t not in stop_words and len(t) > 2]

arabic_nlp = ArabicNLP()