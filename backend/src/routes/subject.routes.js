// src/routes/subject.routes.js
const express = require('express');
const { supabase } = require('../config/supabase');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { data: subjects } = await supabase
      .from('subjects').select('id,slug,name_ar,name_en,icon,color,grade_level')
      .eq('is_active', true).order('display_order');
    const { data: chapters } = await supabase
      .from('chapters').select('id,subject_id,slug,name_ar,chapter_number')
      .eq('is_active', true).order('chapter_number');
    const result = (subjects || []).map(s => ({
      ...s, chapters: (chapters || []).filter(c => c.subject_id === s.id),
    }));
    res.json({ subjects: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:slug/stats', async (req, res) => {
  try {
    const { data: subj } = await supabase.from('subjects').select('id').eq('slug', req.params.slug).single();
    if (!subj) return res.status(404).json({ error: 'المادة غير موجودة' });
    const { count } = await supabase.from('questions')
      .select('id', { count: 'exact' }).eq('subject_id', subj.id).eq('is_active', true);
    const { data: years } = await supabase.from('questions')
      .select('year').eq('subject_id', subj.id).not('year', 'is', null);
    const uniqueYears = [...new Set((years || []).map(q => q.year))].sort();
    res.json({ question_count: count || 0, years: uniqueYears });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
