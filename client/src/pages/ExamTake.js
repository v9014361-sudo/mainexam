import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ClientEncryption from '../utils/encryption';
import ExamProctor from '../utils/proctor';

const ExamTake = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('preflight'); // preflight, exam, submitting, result
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [sessionId, setSessionId] = useState(null);
  const [sessionKey, setSessionKey] = useState(null);
  const [settings, setSettings] = useState({});
  const [duration, setDuration] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [violations, setViolations] = useState([]);
  const [totalViolations, setTotalViolations] = useState(0);
  const [maxViolations, setMaxViolations] = useState(5);
  const [alert, setAlert] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false); // Custom confirmation modal
  const [codingResults, setCodingResults] = useState({}); // { [qId]: result }
  const [customInputs, setCustomInputs] = useState({}); // { [qId]: customInput }
  const [accessCode, setAccessCode] = useState('');
  const [windowExitModal, setWindowExitModal] = useState(null); // Blocking modal for window exit
  const [autoTerminateCountdown, setAutoTerminateCountdown] = useState(null); // Countdown seconds
  const [fullscreenModal, setFullscreenModal] = useState(null); // Fullscreen exit modal
  const [fullscreenCountdown, setFullscreenCountdown] = useState(null); // Fullscreen countdown
  const proctorRef = useRef(null);
  const timerRef = useRef(null);

  // ─── VIOLATION HANDLER ────────────────────────────────────
  const handleViolation = useCallback((violation) => {
    setViolations(prev => [...prev, { ...violation, time: new Date().toLocaleTimeString() }]);
    setAlert(violation);
    setTotalViolations(prev => prev + 1);

    // Auto-dismiss non-critical alerts after 5 seconds
    if (!violation.requireAction) {
      setTimeout(() => setAlert(null), 5000);
    }
  }, []);

  const handleWindowExit = useCallback((data) => {
    setWindowExitModal(data);
    setViolations(prev => [...prev, { type: data.reason, message: data.message, time: new Date().toLocaleTimeString() }]);
  }, []);

  const handleWindowReturn = useCallback((data) => {
    setWindowExitModal(null);
    setAutoTerminateCountdown(null);
    if (data?.awayDuration) {
      setAlert({ 
        type: 'window_return', 
        message: data.message,
        requireAction: false 
      });
      setTimeout(() => setAlert(null), 3000);
    }
  }, []);

  const handleWindowExitCountdown = useCallback((data) => {
    setAutoTerminateCountdown(data.remainingSeconds);
  }, []);

  const handleAutoTerminate = useCallback((data) => {
    setPhase('terminated');
    setWindowExitModal(null);
    setAutoTerminateCountdown(null);
    setFullscreenModal(null);
    setFullscreenCountdown(null);
    
    const message = data.immediate 
      ? `🚨 IMMEDIATE TERMINATION: ${data.reason}`
      : `🚨 EXAM AUTO-TERMINATED: ${data.reason}`;
    
    setAlert({ 
      type: 'auto_terminated', 
      message,
      requireAction: true, 
      critical: true 
    });
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleFullscreenExit = useCallback((data) => {
    setFullscreenModal(data);
    setViolations(prev => [...prev, { type: 'fullscreen_exit', message: data.message, time: new Date().toLocaleTimeString() }]);
  }, []);

  const handleFullscreenReturn = useCallback((data) => {
    setFullscreenModal(null);
    setFullscreenCountdown(null);
    if (data?.awayDuration) {
      setAlert({ 
        type: 'fullscreen_return', 
        message: data.message,
        requireAction: false 
      });
      setTimeout(() => setAlert(null), 3000);
    }
  }, []);

  const handleFullscreenCountdown = useCallback((data) => {
    setFullscreenCountdown(data.remainingSeconds);
  }, []);

  const handleTerminated = useCallback((data) => {
    setPhase('terminated');
    setAlert({ type: 'terminated', message: `🚨 EXAM TERMINATED: ${data.reason}`, requireAction: true, critical: true });
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleHeartbeat = useCallback((data) => {
    if (data.remainingMinutes !== undefined) {
      setTimeLeft(data.remainingMinutes * 60);
    }
  }, []);

  // ─── START EXAM ───────────────────────────────────────────
  const startExam = async () => {
    try {
      setError(null);
      const payload = accessCode ? { accessCode: accessCode.trim() } : undefined;
      const { data } = await api.post(`/exam/${id}/start`, payload);
      
      setSessionId(data.sessionId);
      setSessionKey(data.sessionKey);
      setSettings(data.settings);
      setDuration(data.duration);
      setTimeLeft(data.duration * 60);
      setMaxViolations(data.settings.maxViolations || 5);

      // Decrypt questions if encrypted
      let qs;
      if (data.examData.isEncrypted) {
        qs = ClientEncryption.decryptExamData(
          data.examData.encrypted, data.examData.hmac, data.sessionKey
        );
      } else {
        qs = data.examData.questions;
      }
      setQuestions(qs);

      // Initialize proctoring
      const proctor = new ExamProctor(data.sessionId, data.settings, {
        onViolation: handleViolation,
        onTerminated: handleTerminated,
        onHeartbeat: handleHeartbeat,
        onWindowExit: handleWindowExit,
        onWindowReturn: handleWindowReturn,
        onWindowExitCountdown: handleWindowExitCountdown,
        onAutoTerminate: handleAutoTerminate,
        onFullscreenExit: handleFullscreenExit,
        onFullscreenReturn: handleFullscreenReturn,
        onFullscreenCountdown: handleFullscreenCountdown,
      });
      proctorRef.current = proctor;
      proctor.start();

      // Start timer
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setPhase('exam');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start exam');
    }
  };

  // ─── SUBMIT EXAM ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (phase === 'submitting' || phase === 'result') return;
    setPhase('submitting');
    setShowSubmitConfirm(false); // Close the modal if open

    try {
      const answerArray = Object.entries(answers)
        .filter(([qId]) => !qId.endsWith('_lang'))
        .map(([qId, ans]) => ({
          questionId: qId,
          selectedAnswer: ans,
        }));

      // Encrypt answers before sending
      let payload;
      if (settings.encryptQuestions && sessionKey) {
        const { encrypted, hmac } = ClientEncryption.encryptAnswers(answerArray, sessionKey);
        payload = { sessionId, encryptedAnswers: encrypted, answersHMAC: hmac };
      } else {
        payload = { sessionId, answers: answerArray };
      }

      const { data } = await api.post(`/exam/${id}/submit`, payload);
      
      // Stop proctoring ONLY upon successful submission
      if (proctorRef.current) proctorRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);

      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      
      setResult(data);
      setPhase('result');
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
      setPhase('exam'); // Revert phase back to exam; proctoring & timer remain active!
    }
  };

  const runCode = async (qId, code, language, customInput = '') => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const { data} = await api.post('/compiler/run', { 
        language, 
        code,
        input: customInput 
      });
      setCodingResults(prev => ({ ...prev, [qId]: { ...data, isCustomRun: true } }));
    } catch (err) {
      setCodingResults(prev => ({ ...prev, [qId]: { stderr: err.response?.data?.error || 'Execution failed', isCustomRun: true } }));
    } finally {
      setIsRunning(false);
    }
  };

  const submitCodingQuestion = async (qId, code, language) => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const { data } = await api.post('/compiler/submit', {
        examId: id,
        questionId: qId,
        code,
        language,
        sessionId
      });
      setCodingResults(prev => ({ ...prev, [qId]: data }));
      // Also save code to general answers
      setAnswers(prev => ({ ...prev, [qId]: code }));
    } catch (err) {
      setCodingResults(prev => ({ ...prev, [qId]: { error: err.response?.data?.error || 'Submission failed' } }));
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (proctorRef.current) proctorRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      // Remove security styles
      const secStyles = document.getElementById('exam-security-styles');
      if (secStyles) secStyles.remove();
    };
  }, []);

  // ─── FORMAT TIME ──────────────────────────────────────────
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isLowTime = timeLeft < 300; // Under 5 minutes
  const answeredCount = Object.keys(answers).length;

  // ═════════════════════════════════════════════════════════
  // PREFLIGHT CHECK SCREEN
  // ═════════════════════════════════════════════════════════
  if (phase === 'preflight') {
    return (
      <div style={s.preflightWrap}>
        <div style={s.preflightCard} className="fade-in">
          <div style={s.shieldIcon}>🛡️</div>
          <h1 style={s.preTitle}>Secure Exam Environment</h1>
          <p style={s.preSubtitle}>Please review the security requirements before starting</p>
          
          {/* STRICT MODE WARNING */}
          <div style={s.strictWarningBox}>
            <div style={s.strictWarningIcon}>⚠️</div>
            <div>
              <h3 style={s.strictWarningTitle}>STRICT FULLSCREEN REQUIREMENT</h3>
              <p style={s.strictWarningText}>
                This exam requires <strong>FULLSCREEN MODE AT ALL TIMES</strong>. 
                If you exit fullscreen, you will have <strong>30 SECONDS</strong> to click the "Re-enter Fullscreen" button. 
                If you do not re-enter fullscreen within 30 seconds, your exam will be <strong>AUTOMATICALLY TERMINATED</strong>. 
                Tab switching or leaving the window will also trigger termination after 30 seconds.
              </p>
            </div>
          </div>
          
          <div style={s.checkList}>
            <div style={s.checkItem}>
              <span style={s.checkIcon}>✓</span>
              <div><strong>Fullscreen Mode Required</strong><br/><span style={s.checkDesc}>The exam must run in fullscreen. If you exit, you have 30 seconds to re-enter.</span></div>
            </div>
            <div style={s.checkItem}>
              <span style={{ ...s.checkIcon, color: 'var(--danger)' }}>!</span>
              <div><strong>30-Second Grace Period</strong><br/><span style={s.checkDesc}>When you exit fullscreen, a button will appear. Click it within 30 seconds to continue.</span></div>
            </div>
            <div style={s.checkItem}>
              <span style={{ ...s.checkIcon, color: 'var(--danger)' }}>!</span>
              <div><strong>Auto-Termination After 30s</strong><br/><span style={s.checkDesc}>If you don't re-enter fullscreen within 30 seconds, your exam will automatically terminate.</span></div>
            </div>
            <div style={s.checkItem}>
              <span style={s.checkIcon}>✓</span>
              <div><strong>Tab & Window Monitoring</strong><br/><span style={s.checkDesc}>Switching tabs or windows gives you 30 seconds to return before termination.</span></div>
            </div>
            <div style={s.checkItem}>
              <span style={s.checkIcon}>✓</span>
              <div><strong>Copy/Paste Disabled</strong><br/><span style={s.checkDesc}>Clipboard operations are blocked during the exam.</span></div>
            </div>
            <div style={s.checkItem}>
              <span style={s.checkIcon}>✓</span>
              <div><strong>Screenshot Prevention</strong><br/><span style={s.checkDesc}>Screen capture attempts will be detected and blocked.</span></div>
            </div>
            <div style={s.checkItem}>
              <span style={s.checkIcon}>✓</span>
              <div><strong>Session Encryption</strong><br/><span style={s.checkDesc}>Exam data is encrypted per session and validated for integrity.</span></div>
            </div>
            <div style={s.checkItem}>
              <span style={{ ...s.checkIcon, color: 'var(--danger)' }}>!</span>
              <div><strong>Stay Focused</strong><br/><span style={s.checkDesc}>Remain in fullscreen mode throughout the exam. Any interruption starts a 30-second countdown.</span></div>
            </div>
          </div>

          {error && <div style={s.errorBox}>{error}</div>}

          <div style={s.accessRow}>
            <label style={s.accessLabel}>Access Code (if required)</label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              style={s.accessInput}
              placeholder="Enter access code"
            />
          </div>

          <div style={s.preActions}>
            <button onClick={() => navigate('/dashboard')} style={s.backBtn}>← Back to Dashboard</button>
            <button onClick={startExam} style={s.startBtn}>
              🔒 Enter Secure Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  // RESULT SCREEN
  // ═════════════════════════════════════════════════════════
  if (phase === 'result' || phase === 'terminated') {
    return (
      <div style={s.resultWrap}>
        <div style={s.resultCard} className="fade-in">
          {phase === 'terminated' ? (
            <>
              <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '1rem' }}>🚫</div>
              <h1 style={{ ...s.resTitle, color: 'var(--danger)' }}>Exam Terminated</h1>
              <p style={s.resSubtitle}>Your exam was terminated due to security violations.</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '1rem' }}>{result?.passed ? '🎉' : '📊'}</div>
              <h1 style={s.resTitle}>{result?.passed ? 'Congratulations!' : 'Exam Completed'}</h1>
              <div style={s.scoreCircle}>
                <span style={s.scoreNum}>{result?.percentage?.toFixed(1)}%</span>
                <span style={s.scoreLabel}>{result?.passed ? 'PASSED' : 'NOT PASSED'}</span>
              </div>
              <div style={s.statGrid}>
                <div style={s.statItem}><span style={s.statVal}>{result?.score}</span><span style={s.statLbl}>Score</span></div>
                <div style={s.statItem}><span style={s.statVal}>{result?.totalPoints}</span><span style={s.statLbl}>Total</span></div>
                <div style={s.statItem}><span style={s.statVal}>{result?.totalViolations || 0}</span><span style={s.statLbl}>Violations</span></div>
              </div>
            </>
          )}
          <button onClick={() => navigate('/dashboard')} style={s.startBtn}>← Return to Dashboard</button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════
  // EXAM INTERFACE
  // ═════════════════════════════════════════════════════════
  const currentQuestion = questions[currentQ];

  return (
    <div style={s.examWrap} className="exam-secure-content exam-watermark">
      {/* ─── FULLSCREEN EXIT MODAL (30 SECOND COUNTDOWN) ─── */}
      {fullscreenModal && (
        <div style={s.fullscreenOverlay}>
          <div style={s.fullscreenBox} className="fade-in">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
              {fullscreenModal.remainingChances > 0 ? '⚠️' : '🚨'}
            </div>
            <h2 style={s.fullscreenTitle}>FULLSCREEN MODE EXITED</h2>
            <div style={s.exitCountBadge}>
              Exit {fullscreenModal.exitCount || 1} of {fullscreenModal.maxExits || 8}
            </div>
            {fullscreenModal.remainingChances !== undefined && (
              <div style={{
                ...s.remainingChancesBadge,
                background: fullscreenModal.remainingChances === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                color: fullscreenModal.remainingChances === 0 ? 'var(--danger)' : 'var(--warning)',
              }}>
                {fullscreenModal.remainingChances > 0 
                  ? `${fullscreenModal.remainingChances} chances remaining`
                  : 'FINAL WARNING - NO MORE CHANCES!'}
              </div>
            )}
            <p style={s.fullscreenMsg}>{fullscreenModal.message}</p>
            
            {fullscreenCountdown !== null && (
              <div style={s.fsCountdownBox}>
                <div style={s.fsCountdownCircle}>
                  <span style={s.fsCountdownNum}>{fullscreenCountdown}</span>
                </div>
                <p style={s.fsCountdownText}>
                  ⏱ RE-ENTER FULLSCREEN WITHIN {fullscreenCountdown} SECONDS
                </p>
                <p style={s.fsCountdownWarning}>
                  Click the button below to re-enter fullscreen mode or your exam will be automatically terminated!
                </p>
              </div>
            )}

            <button 
              style={s.fullscreenBtn}
              onClick={() => {
                proctorRef.current?.requestFullscreen();
              }}
            >
              🔒 Re-enter Fullscreen Mode
            </button>
            
            <p style={s.fullscreenFooter}>
              You must click this button and re-enter fullscreen to continue your exam.
            </p>
          </div>
        </div>
      )}

      {/* ─── WINDOW EXIT BLOCKING MODAL ─── */}
      {windowExitModal && (
        <div style={s.blockingOverlay}>
          <div style={s.blockingBox} className="fade-in">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚨</div>
            <h2 style={s.blockingTitle}>EXAM WINDOW EXITED</h2>
            <p style={s.blockingMsg}>{windowExitModal.message}</p>
            
            {autoTerminateCountdown !== null && (
              <div style={s.countdownBox}>
                <div style={s.countdownCircle}>
                  <span style={s.countdownNum}>{autoTerminateCountdown}</span>
                </div>
                <p style={s.countdownText}>
                  ⏱ AUTO-TERMINATION IN {autoTerminateCountdown} SECONDS
                </p>
                <p style={s.countdownWarning}>
                  Return to the exam immediately or your exam will be automatically terminated!
                </p>
              </div>
            )}

            <button 
              style={s.returnBtn}
              onClick={() => {
                if (settings.requireFullscreen) {
                  proctorRef.current?.requestFullscreen();
                }
                // The focus event will trigger handleWindowReturn
                window.focus();
              }}
            >
              🔒 Return to Exam
            </button>
            
            <p style={s.blockingFooter}>
              You must click this button and return to the exam window to continue.
            </p>
          </div>
        </div>
      )}

      {/* ─── VIOLATION ALERT OVERLAY ─── */}
      {alert && (
        <div style={alert.critical ? s.alertOverlayCritical : s.alertOverlay} onClick={() => {
          if (alert.requireAction && settings.requireFullscreen) {
            proctorRef.current?.requestFullscreen();
          }
          setAlert(null);
        }}>
          <div style={alert.critical ? s.alertBoxCritical : s.alertBox} className="fade-in">
            <p style={s.alertMsg}>{alert.message}</p>
            {alert.requireAction && (
              <button style={s.alertBtn} onClick={() => {
                if (settings.requireFullscreen) proctorRef.current?.requestFullscreen();
                setAlert(null);
              }}>
                {settings.requireFullscreen ? 'Re-enter Fullscreen' : 'Acknowledge'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── SUBMIT CONFIRMATION OVERLAY ─── */}
      {showSubmitConfirm && (
        <div style={s.submitOverlay} className="fade-in">
          <div style={s.submitConfirmBox}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Submit Your Exam?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>
              Are you sure you want to completely submit your exam now?<br />
              This action <strong>cannot be undone</strong> and you will not be able to return to your answers.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setShowSubmitConfirm(false)} style={s.cancelSubBtn}>Back to Exam</button>
              <button onClick={handleSubmit} style={s.confirmSubBtn}>Yes, Submit Exam</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOP BAR ─── */}
      <div style={s.topBar}>
        <div style={s.topLeft}>
          <span style={s.topLogo}>🔒 SecureExam</span>
          <span style={s.qCounter}>
            Question {currentQ + 1} / {questions.length}
          </span>
        </div>
        <div style={s.topCenter}>
          <div style={{ ...s.timer, ...(isLowTime ? s.timerDanger : {}) }}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
        <div style={s.topRight}>
          <div style={{
            ...s.violationCount,
            ...(totalViolations > 0 ? { color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' } : {}),
          }}>
            ⚠ {totalViolations} / {maxViolations}
          </div>
          <span style={s.answeredBadge}>✓ {answeredCount}/{questions.length}</span>
        </div>
      </div>

      {/* ─── MAIN EXAM CONTENT ─── */}
      <div style={s.examContent}>
        {/* Question Panel */}
        <div style={s.questionPanel}>
          <div style={s.qDifficulty}>
            <span style={{
              ...s.diffBadge,
              background: currentQuestion?.difficulty === 'easy' ? 'rgba(16,185,129,0.12)' : currentQuestion?.difficulty === 'hard' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
              color: currentQuestion?.difficulty === 'easy' ? '#34d399' : currentQuestion?.difficulty === 'hard' ? '#f87171' : '#fbbf24',
            }}>
              {currentQuestion?.difficulty?.toUpperCase()}
            </span>
            <span style={s.pts}>{currentQuestion?.points} pts</span>
          </div>

          <h2 style={s.qText}>{currentQuestion?.questionText}</h2>

          {currentQuestion?.imageUrl ? (
            <div style={s.questionImageWrap}>
              <img src={currentQuestion.imageUrl} alt="Question visual" style={s.questionImage} />
            </div>
          ) : null}

          {/* Options (for MCQ/True-False) */}
          {currentQuestion?.questionType === 'mcq' || currentQuestion?.questionType === 'true-false' ? (
            <div style={s.options}>
              {currentQuestion?.options?.map((option, idx) => {
                const isSelected = answers[currentQuestion._id] === option._id;
                return (
                  <button key={option._id || idx} style={{
                    ...s.optionBtn,
                    ...(isSelected ? s.optionSelected : {}),
                  }} onClick={() => setAnswers(prev => ({ ...prev, [currentQuestion._id]: option._id }))}>
                    <span style={{ ...s.optionLetter, ...(isSelected ? s.optionLetterSelected : {}) }}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span style={s.optionText}>{option.text}</span>
                    {isSelected && <span style={s.checkMark}>✓</span>}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Coding Editor (for Coding Questions) */}
          {currentQuestion?.questionType === 'coding' ? (
            <div style={s.codingContainer}>
              <div style={s.codeHeader}>
                <select 
                  value={answers[currentQuestion._id + '_lang'] || 'cpp'} 
                  onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion._id + '_lang']: e.target.value }))}
                  style={s.langSelect}
                >
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                  <option value="c">C</option>
                </select>
                <div style={s.codeActions}>
                  <button 
                    onClick={() => runCode(
                      currentQuestion._id, 
                      answers[currentQuestion._id] || currentQuestion.starterCode, 
                      answers[currentQuestion._id + '_lang'] || 'cpp',
                      customInputs[currentQuestion._id] || ''
                    )}
                    disabled={isRunning}
                    style={s.runBtn}
                  >
                    {isRunning ? 'Running...' : '▶ Run Code'}
                  </button>
                  <button 
                    onClick={() => submitCodingQuestion(currentQuestion._id, answers[currentQuestion._id] || currentQuestion.starterCode, answers[currentQuestion._id + '_lang'] || 'cpp')}
                    disabled={isRunning}
                    style={s.submitCodeBtn}
                  >
                    ✓ Submit Code
                  </button>
                </div>
              </div>
              
              <textarea
                style={s.codeEditor}
                value={answers[currentQuestion._id] !== undefined ? answers[currentQuestion._id] : (currentQuestion.starterCode || '')}
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion._id]: e.target.value }))}
                placeholder="Write your code here..."
                spellCheck="false"
              />

              {/* Public Test Cases Display */}
              {currentQuestion.testCases && currentQuestion.testCases.filter(tc => tc.isPublic).length > 0 && (
                <div style={s.publicTestCases}>
                  <h4 style={s.testCaseTitle}>📋 Public Test Cases</h4>
                  <div style={s.testCaseGrid}>
                    {currentQuestion.testCases.filter(tc => tc.isPublic).map((tc, idx) => (
                      <div key={idx} style={s.publicTestCase}>
                        <div style={s.testCaseLabel}>Test Case {idx + 1}</div>
                        <div style={s.testCaseContent}>
                          <div style={s.testCaseSection}>
                            <span style={s.testCaseSubLabel}>Input:</span>
                            <pre style={s.testCasePre}>{tc.input || '(no input)'}</pre>
                          </div>
                          <div style={s.testCaseSection}>
                            <span style={s.testCaseSubLabel}>Expected Output:</span>
                            <pre style={s.testCasePre}>{tc.expectedOutput}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Input Section */}
              <div style={s.customInputSection}>
                <h4 style={s.customInputTitle}>🧪 Test with Custom Input</h4>
                <textarea
                  style={s.customInputBox}
                  value={customInputs[currentQuestion._id] || ''}
                  onChange={(e) => setCustomInputs(prev => ({ ...prev, [currentQuestion._id]: e.target.value }))}
                  placeholder="Enter custom input here (optional)..."
                  rows={3}
                />
                <p style={s.customInputHint}>
                  💡 Tip: Enter your own test input above and click "Run Code" to test your solution
                </p>
              </div>

              {codingResults[currentQuestion._id] && (
                <div style={s.resultsPanel}>
                  <h4 style={s.resultsH}>
                    {codingResults[currentQuestion._id].isCustomRun ? '🧪 Custom Run Results' : '✓ Submission Results'}
                  </h4>
                  {codingResults[currentQuestion._id].results ? (
                    // Submit results (test cases)
                    <div style={s.testGrid}>
                      <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: codingResults[currentQuestion._id].allPassed ? 'var(--success)' : 'var(--danger)' }}>
                        {codingResults[currentQuestion._id].passedCount} / {codingResults[currentQuestion._id].totalTests} Test Cases Passed
                      </div>
                      {codingResults[currentQuestion._id].results.map((tc, ti) => (
                        <div key={ti} style={{ ...s.testCaseRow, borderColor: tc.passed ? 'var(--success)' : 'var(--danger)' }}>
                          <span>Test {ti + 1}: {tc.passed ? '✅ Passed' : '❌ Failed'}</span>
                          {tc.stderr && <pre style={s.stderrPre}>{tc.stderr}</pre>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Run results (single execution)
                    <div style={s.runResult}>
                      {codingResults[currentQuestion._id].stdout !== undefined && (
                        <div>
                          <p style={s.resultLabel}>Output:</p>
                          <pre style={s.stdoutPre}>{codingResults[currentQuestion._id].stdout || '(no output)'}</pre>
                        </div>
                      )}
                      {codingResults[currentQuestion._id].stderr && (
                        <div>
                          <p style={{ ...s.resultLabel, color: 'var(--danger)' }}>Error:</p>
                          <pre style={s.stderrPre}>{codingResults[currentQuestion._id].stderr}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Short Answer */}
          {currentQuestion?.questionType === 'short-answer' ? (
            <div style={s.field}>
              <textarea
                style={{ ...s.textarea, minHeight: 120 }}
                value={answers[currentQuestion._id] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion._id]: e.target.value }))}
                placeholder="Type your answer here..."
              />
            </div>
          ) : null}

          {/* Navigation */}
          <div style={s.navRow}>
            <button onClick={() => setCurrentQ(p => Math.max(0, p - 1))} disabled={currentQ === 0}
              style={{ ...s.navBtn, opacity: currentQ === 0 ? 0.4 : 1 }}>← Previous</button>
            
            {currentQ === questions.length - 1 ? (
              <button onClick={() => setShowSubmitConfirm(true)}
                style={s.submitBtn}>
                🔒 Submit Exam
              </button>
            ) : (
              <button onClick={() => setCurrentQ(p => Math.min(questions.length - 1, p + 1))} style={s.nextBtn}>
                Next →
              </button>
            )}
          </div>
        </div>

        {/* Question Navigator Sidebar */}
        <div style={s.sidebar}>
          <h4 style={s.sideTitle}>Questions</h4>
          <div style={s.qGrid}>
            {questions.map((q, idx) => (
              <button key={q._id || idx} onClick={() => setCurrentQ(idx)} style={{
                ...s.qDot,
                ...(idx === currentQ ? s.qDotCurrent : {}),
                ...(answers[q._id] ? s.qDotAnswered : {}),
              }}>
                {idx + 1}
              </button>
            ))}
          </div>
          <div style={s.sideLegend}>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--accent)' }} /> Current</span>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--success)' }} /> Answered</span>
            <span style={s.legendItem}><span style={{ ...s.legendDot, background: 'var(--bg-elevated)' }} /> Unanswered</span>
          </div>

          {/* Recent Violations */}
          {violations.length > 0 && (
            <div style={s.violationLog}>
              <h4 style={s.sideTitle}>Recent Alerts</h4>
              {violations.slice(-4).reverse().map((v, i) => (
                <div key={i} style={s.vLogItem}>
                  <span style={s.vTime}>{v.time}</span>
                  <span style={s.vType}>{v.type?.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── STYLES ───────────────────────────────────────────────
const s = {
  // Preflight
  preflightWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.06) 0%, var(--bg-primary) 70%)' },
  preflightCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '2.5rem', maxWidth: 560, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' },
  shieldIcon: { fontSize: '2.5rem', textAlign: 'center', marginBottom: '1rem' },
  preTitle: { fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '0.25rem' },
  preSubtitle: { color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1.5rem' },
  strictWarningBox: { background: 'rgba(239,68,68,0.1)', border: '2px solid var(--danger)', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' },
  strictWarningIcon: { fontSize: '2rem', flexShrink: 0 },
  strictWarningTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  strictWarningText: { fontSize: '0.85rem', color: '#fca5a5', lineHeight: 1.6 },
  checkList: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' },
  checkItem: { display: 'flex', gap: '0.75rem', alignItems: 'flex-start', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.85rem' },
  checkIcon: { color: 'var(--success)', fontWeight: 700, fontSize: '1rem', marginTop: '0.1rem', flexShrink: 0 },
  checkDesc: { color: 'var(--text-muted)', fontSize: '0.78rem' },
  errorBox: { background: 'var(--danger-glow)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', padding: '0.75rem', borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem' },
  accessRow: { display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' },
  accessLabel: { fontSize: '0.8rem', color: 'var(--text-secondary)' },
  accessInput: { background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.65rem 0.75rem', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-display)' },
  preActions: { display: 'flex', gap: '0.75rem' },
  backBtn: { flex: 1, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.85rem', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font-display)', fontWeight: 500 },
  startBtn: { flex: 2, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.85rem', cursor: 'pointer', fontSize: '0.95rem', fontFamily: 'var(--font-display)', fontWeight: 600 },

  // Result
  resultWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' },
  resultCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '3rem', maxWidth: 480, width: '100%', textAlign: 'center' },
  resTitle: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' },
  resSubtitle: { color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' },
  scoreCircle: { width: 140, height: 140, borderRadius: '50%', background: 'var(--bg-primary)', border: '3px solid var(--accent)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' },
  scoreNum: { fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-mono)' },
  scoreLabel: { fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--accent)' },
  statGrid: { display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem' },
  statItem: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statVal: { fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' },
  statLbl: { fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },

  // Alert overlay
  alertOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' },
  alertOverlayCritical: { position: 'fixed', inset: 0, background: 'rgba(127,29,29,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, backdropFilter: 'blur(4px)', animation: 'danger-pulse 1.5s ease-in-out infinite' },
  alertBox: { background: 'var(--bg-card)', border: '1px solid var(--warning)', borderRadius: 12, padding: '2rem', maxWidth: 420, textAlign: 'center' },
  alertBoxCritical: { background: '#1c1017', border: '2px solid var(--danger)', borderRadius: 12, padding: '2rem', maxWidth: 420, textAlign: 'center', animation: 'shake 0.3s ease-in-out' },
  alertMsg: { fontSize: '1rem', marginBottom: '1rem', lineHeight: 1.6 },
  alertBtn: { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 1.5rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.9rem' },

  // Window Exit Blocking Modal
  blockingOverlay: { position: 'fixed', inset: 0, background: 'rgba(127,29,29,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50000, backdropFilter: 'blur(10px)' },
  blockingBox: { background: '#1c1017', border: '3px solid var(--danger)', borderRadius: 16, padding: '3rem', maxWidth: 520, textAlign: 'center', boxShadow: '0 20px 60px rgba(239,68,68,0.5)', animation: 'shake 0.5s ease-in-out' },
  blockingTitle: { fontSize: '1.8rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  blockingMsg: { fontSize: '1.1rem', marginBottom: '2rem', lineHeight: 1.6, color: '#fca5a5' },
  countdownBox: { background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem' },
  countdownCircle: { width: 100, height: 100, borderRadius: '50%', background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', animation: 'danger-pulse 1s ease-in-out infinite', boxShadow: '0 0 30px rgba(239,68,68,0.6)' },
  countdownNum: { fontSize: '2.5rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' },
  countdownText: { fontSize: '1.2rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.5rem', letterSpacing: '0.05em' },
  countdownWarning: { fontSize: '0.9rem', color: '#fca5a5', lineHeight: 1.5 },
  returnBtn: { background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 10, padding: '1rem 2.5rem', cursor: 'pointer', fontSize: '1.1rem', fontFamily: 'var(--font-display)', fontWeight: 700, boxShadow: '0 6px 20px rgba(239,68,68,0.4)', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' },
  blockingFooter: { fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1.5rem', fontStyle: 'italic' },

  // Fullscreen Exit Modal (30 seconds)
  fullscreenOverlay: { position: 'fixed', inset: 0, background: 'rgba(239,68,68,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60000, backdropFilter: 'blur(12px)' },
  fullscreenBox: { background: '#1c1017', border: '4px solid var(--danger)', borderRadius: 16, padding: '3rem', maxWidth: 560, textAlign: 'center', boxShadow: '0 25px 70px rgba(239,68,68,0.7)', animation: 'shake 0.5s ease-in-out' },
  fullscreenTitle: { fontSize: '2rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: '0 2px 10px rgba(239,68,68,0.5)' },
  exitCountBadge: { display: 'inline-block', background: 'rgba(245,158,11,0.2)', color: 'var(--warning)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', border: '2px solid var(--warning)' },
  remainingChancesBadge: { display: 'inline-block', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', border: '2px solid currentColor', letterSpacing: '0.05em' },
  fullscreenMsg: { fontSize: '1.2rem', marginBottom: '2rem', lineHeight: 1.6, color: '#fca5a5', fontWeight: 500 },
  fsCountdownBox: { background: 'rgba(239,68,68,0.15)', border: '3px solid rgba(239,68,68,0.4)', borderRadius: 12, padding: '2rem', marginBottom: '2rem' },
  fsCountdownCircle: { width: 120, height: 120, borderRadius: '50%', background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', animation: 'danger-pulse 0.8s ease-in-out infinite', boxShadow: '0 0 40px rgba(239,68,68,0.8)', border: '3px solid #fff' },
  fsCountdownNum: { fontSize: '3rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' },
  fsCountdownText: { fontSize: '1.3rem', fontWeight: 700, color: 'var(--danger)', marginBottom: '0.75rem', letterSpacing: '0.05em' },
  fsCountdownWarning: { fontSize: '1rem', color: '#fca5a5', lineHeight: 1.6, fontWeight: 500 },
  fullscreenBtn: { background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 12, padding: '1.2rem 3rem', cursor: 'pointer', fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 700, boxShadow: '0 8px 25px rgba(239,68,68,0.5)', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.08em', animation: 'pulse-button 1.5s ease-in-out infinite' },
  fullscreenFooter: { fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1.5rem', fontStyle: 'italic' },

  // Submit Overlay
  submitOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000, backdropFilter: 'blur(8px)' },
  submitConfirmBox: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '3rem', maxWidth: 500, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' },
  cancelSubBtn: { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.8rem 1.5rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.95rem' },
  confirmSubBtn: { background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.8rem 1.5rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' },

  // Top bar
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.5rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 },
  topLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  topLogo: { fontSize: '1rem', fontWeight: 700 },
  qCounter: { color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' },
  topCenter: { position: 'absolute', left: '50%', transform: 'translateX(-50%)' },
  timer: { fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-primary)', padding: '0.4rem 1.2rem', borderRadius: 8, border: '1px solid var(--border)' },
  timerDanger: { color: 'var(--danger)', borderColor: 'var(--danger)', animation: 'danger-pulse 2s ease-in-out infinite' },
  topRight: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  violationCount: { fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '0.3rem 0.7rem', borderRadius: 6, border: '1px solid var(--border)' },
  answeredBadge: { fontSize: '0.78rem', color: 'var(--success)', fontFamily: 'var(--font-mono)' },

  // Exam content
  examWrap: { minHeight: '100vh', background: 'var(--bg-primary)' },
  examContent: { display: 'flex', maxWidth: 1200, margin: '0 auto', padding: '1.5rem', gap: '1.5rem', minHeight: 'calc(100vh - 60px)' },

  // Question panel
  questionPanel: { flex: 1 },
  qDifficulty: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' },
  diffBadge: { fontSize: '0.65rem', fontWeight: 600, padding: '0.15rem 0.6rem', borderRadius: 20, letterSpacing: '0.06em' },
  pts: { fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' },
  qText: { fontSize: '1.15rem', fontWeight: 500, lineHeight: 1.6, marginBottom: '1.5rem' },
  questionImageWrap: { marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: 10, padding: '0.5rem', background: 'var(--bg-card)' },
  questionImage: { width: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 8 },
  options: { display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' },
  optionBtn: { display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '1rem 1.25rem', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', fontSize: '0.95rem' },
  optionSelected: { background: 'var(--accent-glow)', borderColor: 'var(--accent)' },
  optionLetter: { width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.85rem', flexShrink: 0, border: '1px solid var(--border)' },
  optionLetterSelected: { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' },
  optionText: { flex: 1 },
  checkMark: { color: 'var(--accent)', fontWeight: 700, fontSize: '1.1rem' },

  // Navigation
  navRow: { display: 'flex', gap: '0.75rem', justifyContent: 'space-between' },
  navBtn: { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.7rem 1.5rem', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-display)', fontWeight: 500 },
  nextBtn: { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 2rem', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font-display)', fontWeight: 600 },
  submitBtn: { background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 8, padding: '0.7rem 2rem', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font-display)', fontWeight: 600 },

  // Sidebar
  sidebar: { width: 220, flexShrink: 0 },
  sideTitle: { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' },
  qGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem', marginBottom: '1rem' },
  qDot: { width: 36, height: 36, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' },
  qDotCurrent: { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-glow)' },
  qDotAnswered: { background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--success)' },
  sideLegend: { display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1.5rem' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--text-muted)' },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  violationLog: { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' },
  vLogItem: { display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '0.3rem 0', color: 'var(--text-muted)' },
  vTime: { fontFamily: 'var(--font-mono)', color: 'var(--danger)' },
  vType: { textTransform: 'capitalize' },

  // Coding specific styles
  codingContainer: { display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' },
  codeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' },
  langSelect: { background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '0.3rem 0.6rem', fontSize: '0.85rem', outline: 'none' },
  codeActions: { display: 'flex', gap: '0.6rem' },
  runBtn: { background: 'var(--bg-primary)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 6, padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' },
  submitCodeBtn: { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
  codeEditor: { width: '100%', minHeight: 400, background: '#1e1e1e', color: '#d4d4d4', border: 'none', padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.5, outline: 'none', resize: 'vertical' },
  
  // Public Test Cases
  publicTestCases: { padding: '1rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' },
  testCaseTitle: { fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' },
  testCaseGrid: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  publicTestCase: { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem' },
  testCaseLabel: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  testCaseContent: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' },
  testCaseSection: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  testCaseSubLabel: { fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  testCasePre: { background: '#000', color: '#0f0', padding: '0.5rem', borderRadius: 4, fontSize: '0.8rem', fontFamily: 'var(--font-mono)', overflowX: 'auto', border: '1px solid rgba(0,255,0,0.2)' },
  
  // Custom Input Section
  customInputSection: { padding: '1rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' },
  customInputTitle: { fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' },
  customInputBox: { width: '100%', background: '#1e1e1e', color: '#d4d4d4', border: '1px solid var(--border)', borderRadius: 6, padding: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', outline: 'none', resize: 'vertical' },
  customInputHint: { fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' },
  
  resultsPanel: { padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' },
  resultsH: { fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' },
  testGrid: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  testCaseRow: { padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-primary)', fontSize: '0.85rem' },
  runResult: { background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 6, border: '1px solid var(--border)' },
  resultLabel: { fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem' },
  stdoutPre: { background: '#000', color: '#fff', padding: '0.6rem', borderRadius: 4, overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' },
  stderrPre: { background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '0.6rem', borderRadius: 4, overflowX: 'auto', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', border: '1px solid rgba(239,68,68,0.2)' },
};

export default ExamTake;
