import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';

const defaultSettings = {
  shuffleQuestions: true,
  shuffleOptions: true,
  showResults: true,
  requireFullscreen: true,
  detectTabSwitch: true,
  detectCopyPaste: true,
  maxViolations: 5,
  encryptQuestions: true,
  preventScreenCapture: true,
  blockExternalApps: true,
  disableExtensions: false,
  autoSubmitOnViolation: false,
};

const emptyQ = {
  questionText: '',
  questionType: 'mcq',
  imageUrl: '',
  imageInputType: 'link',
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
  correctAnswer: '',
  points: 1,
  difficulty: 'medium',
};

const emptyExam = {
  title: '',
  description: '',
  duration: 60,
  passingScore: 40,
  settings: defaultSettings,
};

const CreateExam = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [exam, setExam] = useState(emptyExam);
  const [questions, setQuestions] = useState([{ ...emptyQ, options: emptyQ.options.map((o) => ({ ...o })) }]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingExam, setLoadingExam] = useState(isEditMode);

  useEffect(() => {
    const fetchExam = async () => {
      if (!isEditMode) return;

      try {
        const { data } = await api.get(`/exam/${id}`);
        const fetched = data.exam;
        setExam({
          title: fetched.title || '',
          description: fetched.description || '',
          duration: fetched.duration || 60,
          passingScore: fetched.passingScore ?? 40,
          settings: { ...defaultSettings, ...(fetched.settings || {}) },
        });

        const mappedQuestions = (fetched.questions || []).map((q) => ({
          questionText: q.questionText || '',
          questionType: q.questionType || 'mcq',
          imageUrl: q.imageUrl || '',
          imageInputType: q.imageUrl && String(q.imageUrl).startsWith('data:') ? 'file' : 'link',
          options: q.options?.length
            ? q.options.map((o) => ({ text: o.text || '', isCorrect: !!o.isCorrect }))
            : emptyQ.options.map((o) => ({ ...o })),
          correctAnswer: q.correctAnswer || '',
          points: q.points ?? 1,
          difficulty: q.difficulty || 'medium',
        }));

        setQuestions(
          mappedQuestions.length
            ? mappedQuestions
            : [{ ...emptyQ, options: emptyQ.options.map((o) => ({ ...o })) }]
        );
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load exam');
      } finally {
        setLoadingExam(false);
      }
    };

    fetchExam();
  }, [id, isEditMode]);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...emptyQ, options: emptyQ.options.map((o) => ({ ...o })) }]);
  };

  const removeQuestion = (idx) => {
    if (questions.length > 1) setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const updateOption = (qIdx, oIdx, field, value) => {
    setQuestions((prev) =>
      prev.map((q, qi) =>
        qi === qIdx
          ? {
              ...q,
              options: q.options.map((o, oi) => {
                if (field === 'isCorrect') return { ...o, isCorrect: oi === oIdx };
                return oi === oIdx ? { ...o, [field]: value } : o;
              }),
            }
          : q
      )
    );
  };

  const handleImageFile = (idx, file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be 2MB or smaller');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setQuestions((prev) =>
        prev.map((q, i) => (i === idx ? { ...q, imageUrl: String(reader.result || ''), imageInputType: 'file' } : q))
      );
    };
    reader.onerror = () => setError('Failed to read image file');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    for (let i = 0; i < questions.length; i += 1) {
      if (!questions[i].questionText.trim()) return setError(`Question ${i + 1} text is required`);
      if (questions[i].questionType === 'mcq' && !questions[i].options.some((o) => o.isCorrect)) {
        return setError(`Question ${i + 1} needs a correct answer`);
      }
    }

    setLoading(true);
    try {
      const payloadQuestions = questions.map(({ imageInputType, ...rest }) => rest);
      if (isEditMode) {
        await api.put(`/exam/${id}`, { ...exam, questions: payloadQuestions });
      } else {
        await api.post('/exam/create', { ...exam, questions: payloadQuestions });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} exam`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = (key) => setExam((prev) => ({ ...prev, settings: { ...prev.settings, [key]: !prev.settings[key] } }));

  const st = {
    wrap: { minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' },
    inner: { maxWidth: 800, margin: '0 auto' },
    hdr: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
    title: { fontSize: '1.5rem', fontWeight: 700 },
    backBtn: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.85rem' },
    section: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.25rem' },
    secTitle: { fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' },
    row: { display: 'flex', gap: '1rem', marginBottom: '0.75rem' },
    field: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.75rem' },
    label: { fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
    input: { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.7rem 0.9rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-display)' },
    textarea: { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.7rem 0.9rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-display)', minHeight: 80, resize: 'vertical' },
    select: { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.7rem 0.9rem', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-display)' },
    toggle: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' },
    toggleLabel: { fontSize: '0.85rem', color: 'var(--text-primary)' },
    toggleBtn: { width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' },
    toggleDot: { position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' },
    qCard: { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '1.25rem', marginBottom: '1rem' },
    qHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
    qNum: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' },
    removeBtn: { background: 'transparent', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-display)' },
    optRow: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' },
    radio: { width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--success)' },
    addBtn: { background: 'var(--bg-card)', color: 'var(--accent)', border: '1px dashed var(--border)', borderRadius: 10, padding: '0.85rem', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font-display)', fontWeight: 500, width: '100%', marginBottom: '1.5rem' },
    error: { background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem' },
    submitBtn: { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.85rem 2rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem', fontFamily: 'var(--font-display)', width: '100%' },
    imageModeRow: { display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' },
    imageModeBtn: { border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', borderRadius: 8, padding: '0.35rem 0.7rem', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font-display)', fontWeight: 600 },
    imageModeBtnActive: { background: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'rgba(37,99,235,0.35)' },
    imagePreviewWrap: { marginTop: '0.55rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    imagePreview: { maxWidth: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)' },
    removeImageBtn: { alignSelf: 'flex-start', background: 'transparent', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '0.25rem 0.55rem', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-display)' },
  };

  return (
    <div style={st.wrap}>
      <div style={st.inner}>
        <div style={st.hdr}>
          <h1 style={st.title}>{isEditMode ? 'Edit Exam' : 'Create New Exam'}</h1>
          <button onClick={() => navigate('/dashboard')} style={st.backBtn}>Back to Dashboard</button>
        </div>

        {loadingExam ? (
          <div style={st.section}>Loading exam...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={st.section}>
              <h3 style={st.secTitle}>Exam Details</h3>
              <div style={st.field}>
                <label style={st.label}>Title</label>
                <input style={st.input} value={exam.title} onChange={(e) => setExam((prev) => ({ ...prev, title: e.target.value }))} required />
              </div>
              <div style={st.field}>
                <label style={st.label}>Description</label>
                <textarea style={st.textarea} value={exam.description} onChange={(e) => setExam((prev) => ({ ...prev, description: e.target.value }))} />
              </div>
              <div style={st.row}>
                <div style={st.field}>
                  <label style={st.label}>Duration (minutes)</label>
                  <input type="number" style={st.input} value={exam.duration} onChange={(e) => setExam((prev) => ({ ...prev, duration: +e.target.value }))} min={1} max={480} required />
                </div>
                <div style={st.field}>
                  <label style={st.label}>Passing Score (%)</label>
                  <input type="number" style={st.input} value={exam.passingScore} onChange={(e) => setExam((prev) => ({ ...prev, passingScore: +e.target.value }))} min={0} max={100} />
                </div>
              </div>
            </div>

            <div style={st.section}>
              <h3 style={st.secTitle}>Security Settings</h3>
              {[
                ['requireFullscreen', 'Require Fullscreen Mode'],
                ['detectTabSwitch', 'Detect Tab Switching'],
                ['detectCopyPaste', 'Block Copy/Paste'],
                ['preventScreenCapture', 'Prevent Screenshots'],
                ['blockExternalApps', 'Detect External Apps'],
                ['disableExtensions', 'Require Extensions Disabled'],
                ['encryptQuestions', 'E2E Encrypt Questions'],
                ['shuffleQuestions', 'Shuffle Questions'],
                ['shuffleOptions', 'Shuffle Options'],
                ['autoSubmitOnViolation', 'Auto-submit on Max Violations'],
              ].map(([key, label]) => (
                <div key={key} style={st.toggle}>
                  <span style={st.toggleLabel}>{label}</span>
                  <button
                    type="button"
                    onClick={() => toggleSetting(key)}
                    style={{ ...st.toggleBtn, background: exam.settings[key] ? 'var(--accent)' : 'var(--bg-primary)' }}
                  >
                    <div style={{ ...st.toggleDot, left: exam.settings[key] ? 23 : 3 }} />
                  </button>
                </div>
              ))}
              <div style={{ ...st.field, marginTop: '0.75rem' }}>
                <label style={st.label}>Max Violations Before Termination</label>
                <input
                  type="number"
                  style={st.input}
                  value={exam.settings.maxViolations}
                  onChange={(e) => setExam((prev) => ({ ...prev, settings: { ...prev.settings, maxViolations: +e.target.value } }))}
                  min={1}
                  max={50}
                />
              </div>
            </div>

            <div style={st.section}>
              <h3 style={st.secTitle}>Questions ({questions.length})</h3>
              {questions.map((q, qi) => (
                <div key={qi} style={st.qCard}>
                  <div style={st.qHeader}>
                    <span style={st.qNum}>Question {qi + 1}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select value={q.difficulty} onChange={(e) => updateQuestion(qi, 'difficulty', e.target.value)} style={{ ...st.select, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <input
                        type="number"
                        value={q.points}
                        onChange={(e) => updateQuestion(qi, 'points', +e.target.value)}
                        style={{ ...st.input, width: 60, padding: '0.3rem', fontSize: '0.8rem', textAlign: 'center' }}
                        min={0}
                        placeholder="pts"
                      />
                      <button type="button" onClick={() => removeQuestion(qi)} style={st.removeBtn}>x</button>
                    </div>
                  </div>

                  <div style={st.field}>
                    <textarea
                      style={{ ...st.textarea, minHeight: 60 }}
                      value={q.questionText}
                      onChange={(e) => updateQuestion(qi, 'questionText', e.target.value)}
                      placeholder="Enter question..."
                      required
                    />
                  </div>

                  <div style={st.field}>
                    <label style={st.label}>Question Image (optional)</label>
                    <div style={st.imageModeRow}>
                      <button
                        type="button"
                        style={{ ...st.imageModeBtn, ...(q.imageInputType === 'link' ? st.imageModeBtnActive : {}) }}
                        onClick={() => updateQuestion(qi, 'imageInputType', 'link')}
                      >
                        Link
                      </button>
                      <button
                        type="button"
                        style={{ ...st.imageModeBtn, ...(q.imageInputType === 'file' ? st.imageModeBtnActive : {}) }}
                        onClick={() => updateQuestion(qi, 'imageInputType', 'file')}
                      >
                        Upload
                      </button>
                    </div>
                    {q.imageInputType === 'link' ? (
                      <input
                        style={st.input}
                        value={q.imageUrl || ''}
                        onChange={(e) => updateQuestion(qi, 'imageUrl', e.target.value)}
                        placeholder="https://example.com/question-image.png"
                      />
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        style={st.input}
                        onChange={(e) => handleImageFile(qi, e.target.files?.[0])}
                      />
                    )}
                    {q.imageUrl ? (
                      <div style={st.imagePreviewWrap}>
                        <img src={q.imageUrl} alt="Question preview" style={st.imagePreview} />
                        <button type="button" style={st.removeImageBtn} onClick={() => updateQuestion(qi, 'imageUrl', '')}>Remove Image</button>
                      </div>
                    ) : null}
                  </div>

                  <div style={{ ...st.label, marginBottom: '0.4rem' }}>Options (select the correct one)</div>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={st.optRow}>
                      <input type="radio" name={`correct-${qi}`} checked={opt.isCorrect} onChange={() => updateOption(qi, oi, 'isCorrect', true)} style={st.radio} />
                      <input
                        style={{ ...st.input, flex: 1 }}
                        value={opt.text}
                        onChange={(e) => updateOption(qi, oi, 'text', e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        required
                      />
                    </div>
                  ))}
                </div>
              ))}
              <button type="button" onClick={addQuestion} style={st.addBtn}>+ Add Question</button>
            </div>

            {error && <div style={st.error}>{error}</div>}
            <button type="submit" style={st.submitBtn} disabled={loading}>
              {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Exam' : 'Create Secure Exam')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateExam;
