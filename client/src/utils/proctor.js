import api from './api';

/**
 * ExamProctor - Comprehensive Exam Security & Proctoring System
 * 
 * Detects: Tab switching, window blur, fullscreen exit, copy/paste,
 * right-click, DevTools, screen capture attempts, keyboard shortcuts,
 * external app detection, multiple monitors, browser resize, idle timeout
 */
class ExamProctor {
  constructor(sessionId, settings, callbacks = {}) {
    this.sessionId = sessionId;
    this.settings = settings;
    this.callbacks = callbacks;
    this.violations = [];
    this.isActive = false;
    this.heartbeatInterval = null;
    this.idleTimer = null;
    this.lastActivity = Date.now();
    this.isFullscreen = false;
    this.handlers = {};
    this.extensionCheckInterval = null;
    this.extensionFlagsSeen = new Set();
    this.cleanupFns = [];
    this.originalWindowOpen = null;
    this.originalGetDisplayMedia = null;
    this.screenSharePermissionStatus = null;
    this.screenSharePermissionPoll = null;
    this.hasWarnedScreenSharePermission = false;
    this.lastViolationAt = {};
    this.violationCooldownMs = 1500;
    // Window exit detection and auto-termination
    this.isWindowActive = true;
    this.windowExitTimer = null;
    this.windowExitStartTime = null;
    this.autoTerminationSeconds = 30; // Auto-terminate after 30 seconds away
    this.fullscreenExitTimer = null;
    this.fullscreenExitStartTime = null;
    this.fullscreenExitCount = 0; // Track number of fullscreen exits
    this.maxFullscreenExits = 8; // Allow 8 exits before termination
  }

  // ─── START PROCTORING ─────────────────────────────────────
  start() {
    if (this.isActive) return;
    this.isActive = true;

    // Enter fullscreen
    if (this.settings.requireFullscreen) {
      this.requestFullscreen();
    }

    // Register all event listeners
    this._registerVisibilityDetection();
    this._registerFullscreenDetection();
    this._registerCopyPasteDetection();
    this._registerRightClickDetection();
    this._registerNavigationBlocking();
    this._registerKeyboardShortcuts();
    this._registerDevToolsDetection();
    this._registerScreenCaptureDetection();
    this._registerScreenSharingDetection();
    this._registerExternalAppDetection();
    this._registerExtensionDetection();
    this._registerBrowserResizeDetection();
    this._registerIdleDetection();
    this._startHeartbeat();
    this._disableTextSelection();
    this._registerMultipleMonitorDetection();

    console.log('🔒 ExamProctor: All security systems activated');
  }

  // ─── STOP PROCTORING ──────────────────────────────────────
  stop() {
    this.isActive = false;
    
    // Remove all event listeners
    Object.entries(this.handlers).forEach(([event, handler]) => {
      if (event.startsWith('document:')) {
        document.removeEventListener(event.replace('document:', ''), handler);
      } else if (event.startsWith('window:')) {
        window.removeEventListener(event.replace('window:', ''), handler);
      }
    });

    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.idleWarningTimer) clearTimeout(this.idleWarningTimer);
    if (this.devToolsInterval) clearInterval(this.devToolsInterval);
    if (this.extensionCheckInterval) clearInterval(this.extensionCheckInterval);
    if (this.screenSharePermissionPoll) clearInterval(this.screenSharePermissionPoll);
    if (this.windowExitTimer) clearInterval(this.windowExitTimer);
    if (this.strictFullscreenInterval) clearInterval(this.strictFullscreenInterval);
    if (this.fullscreenExitTimer) clearInterval(this.fullscreenExitTimer);

    // Restore patched browser APIs
    if (this.originalWindowOpen) {
      window.open = this.originalWindowOpen;
      this.originalWindowOpen = null;
    }
    if (this.originalGetDisplayMedia && navigator.mediaDevices) {
      navigator.mediaDevices.getDisplayMedia = this.originalGetDisplayMedia;
      this.originalGetDisplayMedia = null;
    }

    // Run non-standard listener cleanups (Permissions API, etc.)
    this.cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        // Ignore cleanup failures
      }
    });
    this.cleanupFns = [];

    // Re-enable text selection
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';

    console.log('🔓 ExamProctor: Security systems deactivated');
  }

  // ─── FULLSCREEN MANAGEMENT ────────────────────────────────
  _supportsFullscreen() {
    const elem = document.documentElement;
    return !!(elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen);
  }

  async requestFullscreen() {
    if (!this._supportsFullscreen()) {
      this.isFullscreen = false;
      return false;
    }

    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) await elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
      this.isFullscreen = true;
      this._updateFullscreenStatus(true);
      return true;
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
      // Mobile browsers may block fullscreen; do not penalize as a violation.
      return false;
    }
  }

  // ─── TAB SWITCH / WINDOW BLUR DETECTION ───────────────────
  _registerVisibilityDetection() {
    // Page Visibility API
    const visibilityHandler = () => {
      if (!this.isActive) return;
      if (document.hidden || document.visibilityState === 'hidden') {
        this._handleWindowExit('tab_switch');
        this._reportViolation('tab_switch', 'Tab switch or window hidden detected', 'high');
      } else {
        this._handleWindowReturn();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    this.handlers['document:visibilitychange'] = visibilityHandler;

    // Window blur detection
    const blurHandler = () => {
      if (!this.isActive) return;
      this._handleWindowExit('window_blur');
      this._reportViolation('window_blur', 'Window lost focus - possible app switch', 'high');
    };
    window.addEventListener('blur', blurHandler);
    this.handlers['window:blur'] = blurHandler;

    // Focus recovery
    const focusHandler = () => {
      if (!this.isActive) return;
      this._handleWindowReturn();
      // Re-request fullscreen if lost
      if (this.settings.requireFullscreen && !this.isFullscreen) {
        this.requestFullscreen();
      }
    };
    window.addEventListener('focus', focusHandler);
    this.handlers['window:focus'] = focusHandler;
  }

  // ─── HANDLE WINDOW EXIT ───────────────────────────────────
  _handleWindowExit(reason) {
    if (!this.isWindowActive) return; // Already handling exit
    
    this.isWindowActive = false;
    this.windowExitStartTime = Date.now();

    // STRICT MODE: Reduce timeout to 10 seconds for non-fullscreen violations
    const timeoutSeconds = this.settings.strictFullscreen ? 10 : this.autoTerminationSeconds;

    // Show persistent blocking modal
    this.callbacks.onWindowExit?.({
      reason,
      message: this.settings.strictFullscreen 
        ? '🚨 STRICT MODE: You have left the exam window! Return within 10 seconds or exam will terminate!'
        : '🚨 CRITICAL: You have left the exam window! Click "Return to Exam" to continue.',
      requireAction: true,
      blocking: true,
      strictMode: this.settings.strictFullscreen,
      timeoutSeconds,
    });

    // Start auto-termination countdown timer
    this.windowExitTimer = setInterval(() => {
      if (!this.isActive || this.isWindowActive) {
        clearInterval(this.windowExitTimer);
        this.windowExitTimer = null;
        return;
      }

      const elapsedSeconds = Math.floor((Date.now() - this.windowExitStartTime) / 1000);
      const remainingSeconds = timeoutSeconds - elapsedSeconds;

      if (remainingSeconds <= 0) {
        // Auto-terminate the exam
        clearInterval(this.windowExitTimer);
        this.windowExitTimer = null;
        this._reportViolation('auto_terminated', 'Exam auto-terminated due to prolonged window exit', 'critical');
        this.callbacks.onAutoTerminate?.({
          reason: this.settings.strictFullscreen
            ? 'STRICT MODE: You left the exam window. Exam automatically terminated.'
            : 'You stayed away from the exam window for too long',
          awayDuration: elapsedSeconds,
          strictMode: this.settings.strictFullscreen,
        });
        this.stop();
      } else {
        // Update countdown
        this.callbacks.onWindowExitCountdown?.({
          remainingSeconds,
          message: this.settings.strictFullscreen
            ? `⏱ STRICT MODE: AUTO-TERMINATION IN ${remainingSeconds} SECONDS!`
            : `⏱ AUTO-TERMINATION IN ${remainingSeconds} SECONDS! Return to exam immediately!`,
          strictMode: this.settings.strictFullscreen,
        });
      }
    }, 1000);
  }

  // ─── HANDLE WINDOW RETURN ─────────────────────────────────
  _handleWindowReturn() {
    if (this.isWindowActive) return; // Already active
    
    this.isWindowActive = true;
    
    // Clear auto-termination timer
    if (this.windowExitTimer) {
      clearInterval(this.windowExitTimer);
      this.windowExitTimer = null;
    }

    // Calculate how long they were away
    if (this.windowExitStartTime) {
      const awayDuration = Math.floor((Date.now() - this.windowExitStartTime) / 1000);
      this.windowExitStartTime = null;
      
      // Notify return
      this.callbacks.onWindowReturn?.({
        awayDuration,
        message: `✓ Welcome back! You were away for ${awayDuration} seconds.`,
      });
    }
  }

  // ─── FULLSCREEN EXIT DETECTION ────────────────────────────
  _registerFullscreenDetection() {
    const fsHandler = () => {
      if (!this.isActive) return;
      const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
      this.isFullscreen = isFS;
      
      if (!isFS && this.settings.requireFullscreen) {
        this._reportViolation('fullscreen_exit', 'Exited fullscreen mode', 'critical');
        this._handleFullscreenExit();
        this._updateFullscreenStatus(false);
      } else if (isFS) {
        // Returned to fullscreen
        this._handleFullscreenReturn();
      }
    };
    document.addEventListener('fullscreenchange', fsHandler);
    document.addEventListener('webkitfullscreenchange', fsHandler);
    this.handlers['document:fullscreenchange'] = fsHandler;
    this.handlers['document:webkitfullscreenchange'] = fsHandler;
  }

  // ─── HANDLE FULLSCREEN EXIT ───────────────────────────────
  _handleFullscreenExit() {
    if (this.fullscreenExitTimer) return; // Already handling
    
    // Increment exit count
    this.fullscreenExitCount++;
    
    console.log(`🚨 Fullscreen exit detected! Count: ${this.fullscreenExitCount}/${this.maxFullscreenExits}`);
    
    const remainingChances = this.maxFullscreenExits - this.fullscreenExitCount;
    
    // Check if exceeded maximum exits (9th exit = terminate immediately)
    if (this.fullscreenExitCount > this.maxFullscreenExits) {
      // Immediate termination - no more chances
      console.log('❌ Maximum fullscreen exits exceeded - terminating immediately');
      this._reportViolation('fullscreen_max_exits', `Exceeded maximum fullscreen exits (${this.maxFullscreenExits})`, 'critical');
      this.callbacks.onAutoTerminate?.({
        reason: `You exited fullscreen ${this.fullscreenExitCount} times. Maximum allowed is ${this.maxFullscreenExits}. Exam automatically terminated.`,
        violationType: 'fullscreen_max_exits',
        immediate: true,
      });
      this.stop();
      return;
    }
    
    this.fullscreenExitStartTime = Date.now();

    // Show blocking modal with "Re-enter Fullscreen" button
    const modalMessage = remainingChances > 0 
      ? `🚨 YOU EXITED FULLSCREEN MODE!\n\nExit ${this.fullscreenExitCount} of ${this.maxFullscreenExits} - ${remainingChances} chances remaining.\n\nClick the button below to re-enter fullscreen within 30 seconds.`
      : `🚨 FINAL WARNING!\n\nThis is your last chance (Exit ${this.fullscreenExitCount}/${this.maxFullscreenExits})!\n\nClick the button below to re-enter fullscreen immediately!`;
    
    console.log('📢 Showing fullscreen exit modal:', modalMessage);
    
    this.callbacks.onFullscreenExit?.({
      message: modalMessage,
      requireAction: true,
      blocking: true,
      exitCount: this.fullscreenExitCount,
      maxExits: this.maxFullscreenExits,
      remainingChances,
    });

    // Start 30-second countdown
    let countdownSeconds = 30;
    this.fullscreenExitTimer = setInterval(() => {
      if (!this.isActive || this.isFullscreen) {
        console.log('✅ Fullscreen restored or exam stopped - clearing timer');
        clearInterval(this.fullscreenExitTimer);
        this.fullscreenExitTimer = null;
        return;
      }

      countdownSeconds--;
      console.log(`⏱ Fullscreen countdown: ${countdownSeconds} seconds remaining`);

      if (countdownSeconds <= 0) {
        // Auto-terminate after 30 seconds
        console.log('❌ 30 seconds elapsed - terminating exam');
        clearInterval(this.fullscreenExitTimer);
        this.fullscreenExitTimer = null;
        this._reportViolation('fullscreen_timeout', 'Failed to re-enter fullscreen within 30 seconds', 'critical');
        this.callbacks.onAutoTerminate?.({
          reason: 'You did not re-enter fullscreen mode within 30 seconds. Exam automatically terminated.',
          violationType: 'fullscreen_timeout',
        });
        this.stop();
      } else {
        // Update countdown
        this.callbacks.onFullscreenCountdown?.({
          remainingSeconds: countdownSeconds,
          message: `⏱ You must re-enter fullscreen within ${countdownSeconds} seconds or exam will terminate!`,
          exitCount: this.fullscreenExitCount,
          remainingChances,
        });
      }
    }, 1000);
  }

  // ─── HANDLE FULLSCREEN RETURN ─────────────────────────────
  _handleFullscreenReturn() {
    if (this.fullscreenExitTimer) {
      clearInterval(this.fullscreenExitTimer);
      this.fullscreenExitTimer = null;
      
      const awayDuration = this.fullscreenExitStartTime 
        ? Math.floor((Date.now() - this.fullscreenExitStartTime) / 1000)
        : 0;
      
      this.fullscreenExitStartTime = null;
      
      this.callbacks.onFullscreenReturn?.({
        awayDuration,
        message: `✓ Fullscreen restored. You were out of fullscreen for ${awayDuration} seconds.`,
      });
    }
  }

  // ─── COPY/PASTE DETECTION ────────────────────────────────
  _registerCopyPasteDetection() {
    if (!this.settings.detectCopyPaste) return;

    const copyHandler = (e) => {
      if (!this.isActive) return;
      e.preventDefault();
      this._reportViolation('copy_attempt', 'Copy attempt blocked', 'medium');
      this.callbacks.onViolation?.({ type: 'copy_attempt', message: '⚠️ Copying is not allowed during the exam.' });
    };
    const pasteHandler = (e) => {
      if (!this.isActive) return;
      e.preventDefault();
      this._reportViolation('paste_attempt', 'Paste attempt blocked', 'medium');
      this.callbacks.onViolation?.({ type: 'paste_attempt', message: '⚠️ Pasting is not allowed during the exam.' });
    };
    const cutHandler = (e) => {
      if (!this.isActive) return;
      e.preventDefault();
    };

    document.addEventListener('copy', copyHandler);
    document.addEventListener('paste', pasteHandler);
    document.addEventListener('cut', cutHandler);
    this.handlers['document:copy'] = copyHandler;
    this.handlers['document:paste'] = pasteHandler;
    this.handlers['document:cut'] = cutHandler;
  }

  // ─── RIGHT CLICK DETECTION ───────────────────────────────
  _registerRightClickDetection() {
    const contextHandler = (e) => {
      if (!this.isActive) return;
      e.preventDefault();
      this._reportViolation('right_click', 'Right-click menu blocked', 'low');
      this.callbacks.onViolation?.({ type: 'right_click', message: '⚠️ Right-click is disabled during the exam.' });
    };
    document.addEventListener('contextmenu', contextHandler);
    this.handlers['document:contextmenu'] = contextHandler;
  }

  // ─── NEW TAB / WINDOW BLOCKING ───────────────────────────
  _registerNavigationBlocking() {
    const clickHandler = (e) => {
      if (!this.isActive) return;

      const anchor = e.target?.closest?.('a[href]');
      if (!anchor) return;

      const opensNewTab =
        anchor.target === '_blank' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.button === 1;

      if (!opensNewTab) return;

      e.preventDefault();
      e.stopPropagation();
      this._reportViolation('external_app_detected', 'Blocked attempt to open link in new tab/window', 'high');
      this.callbacks.onViolation?.({
        type: 'external_app_detected',
        message: '🚨 Opening new tabs or windows is blocked during the exam.',
        requireAction: true,
      });
    };

    const auxClickHandler = (e) => {
      if (!this.isActive) return;
      if (e.button !== 1) return;
      const anchor = e.target?.closest?.('a[href]');
      if (!anchor) return;

      e.preventDefault();
      e.stopPropagation();
      this._reportViolation('external_app_detected', 'Middle-click new-tab attempt blocked', 'high');
      this.callbacks.onViolation?.({
        type: 'external_app_detected',
        message: '🚨 Opening new tabs or windows is blocked during the exam.',
        requireAction: true,
      });
    };

    document.addEventListener('click', clickHandler, true);
    document.addEventListener('auxclick', auxClickHandler, true);
    this.handlers['document:click'] = clickHandler;
    this.handlers['document:auxclick'] = auxClickHandler;
  }

  // ─── KEYBOARD SHORTCUTS BLOCKING ─────────────────────────
  _registerKeyboardShortcuts() {
    const keyHandler = (e) => {
      if (!this.isActive) return;

      // Block dangerous shortcuts
      const blockedCombos = [
        { ctrl: true, key: 'c' },   // Copy
        { ctrl: true, key: 'v' },   // Paste
        { ctrl: true, key: 'x' },   // Cut
        { ctrl: true, key: 'a' },   // Select all
        { ctrl: true, key: 'p' },   // Print
        { ctrl: true, key: 's' },   // Save
        { ctrl: true, key: 'u' },   // View source
        { ctrl: true, shift: true, key: 'i' }, // DevTools
        { ctrl: true, shift: true, key: 'j' }, // DevTools Console
        { ctrl: true, shift: true, key: 'c' }, // DevTools Elements
        { key: 'F12' },              // DevTools
        { key: 'F5' },               // Refresh
        { ctrl: true, key: 'r' },    // Refresh
        { key: 'F11' },              // Fullscreen toggle
        { alt: true, key: 'Tab' },   // Alt+Tab (limited browser support)
        { meta: true, key: 'Tab' },  // Cmd+Tab (Mac, limited)
        { key: 'PrintScreen' },      // Screenshot
        { ctrl: true, key: 'PrintScreen' },
        { alt: true, key: 'F4' },    // Close window
        { ctrl: true, key: 'w' },    // Close tab
        { ctrl: true, key: 't' },    // New tab
        { ctrl: true, key: 'n' },    // New window
        { ctrl: true, shift: true, key: 'n' }, // Incognito
      ];

      const isBlocked = blockedCombos.some(combo => {
        const ctrlMatch = combo.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = combo.shift ? e.shiftKey : !combo.shift;
        const altMatch = combo.alt ? e.altKey : !combo.alt;
        const metaMatch = combo.meta ? e.metaKey : true;
        const keyMatch = e.key === combo.key || e.key === combo.key?.toUpperCase();
        return ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch;
      });

      if (isBlocked) {
        e.preventDefault();
        e.stopPropagation();
        this._reportViolation('keyboard_shortcut', `Blocked shortcut: ${e.key}`, 'medium');
        this.callbacks.onViolation?.({ 
          type: 'keyboard_shortcut', 
          message: `⚠️ Keyboard shortcut (${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}) is blocked during the exam.` 
        });
        return false;
      }
    };

    document.addEventListener('keydown', keyHandler, true); // Use capture phase
    this.handlers['document:keydown'] = keyHandler;
  }

  // ─── DEVTOOLS DETECTION ───────────────────────────────────
  _registerDevToolsDetection() {
    // Method 1: Window size discrepancy
    const checkDevTools = () => {
      if (!this.isActive) return;
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        this._reportViolation('devtools_open', 'Developer tools appear to be open', 'critical');
        this.callbacks.onViolation?.({
          type: 'devtools_open',
          message: '🚨 CRITICAL: Developer tools detected! Close them immediately.',
          requireAction: true,
        });
      }
    };

    this.devToolsInterval = setInterval(checkDevTools, 3000);

    // Method 2: debugger detection via console timing
    const consoleCheck = () => {
      if (!this.isActive) return;
      const start = performance.now();
      // debugger statement timing - if devtools open, this pauses
      const duration = performance.now() - start;
      if (duration > 100) {
        this._reportViolation('devtools_open', 'Debugger detected via timing', 'critical');
      }
    };
    // Run periodically but less frequently
    setInterval(consoleCheck, 10000);
  }

  // ─── SCREEN CAPTURE DETECTION ─────────────────────────────
  _registerScreenCaptureDetection() {
    if (!this.settings.preventScreenCapture) return;

    // Detect Print Screen and common screenshot shortcuts
    const screenshotHandler = (e) => {
      if (!this.isActive) return;

      const key = String(e.key || '').toLowerCase();
      const isPrintScreen = e.key === 'PrintScreen' || e.code === 'PrintScreen';
      const isMacScreenshot = e.metaKey && e.shiftKey && ['3', '4', '5'].includes(key);
      const isWindowsSnip = (e.metaKey || e.ctrlKey) && e.shiftKey && key === 's';

      if (isPrintScreen || isMacScreenshot || isWindowsSnip) {
        e.preventDefault();
        e.stopPropagation();
        this._reportViolation('screenshot_attempt', 'Screenshot attempt detected', 'high');
        this.callbacks.onViolation?.({ type: 'screenshot_attempt', message: '🚨 Screenshot attempts are not allowed!' });
        // Clear clipboard as a countermeasure
        if (navigator.clipboard) {
          navigator.clipboard.writeText('').catch(() => {});
        }
      }
    };
    document.addEventListener('keyup', screenshotHandler, true);
    this.handlers['document:keyup'] = screenshotHandler;

    // CSS-based screen capture prevention
    this._applyScreenCaptureCSS();
  }

  _applyScreenCaptureCSS() {
    const style = document.createElement('style');
    style.id = 'exam-security-styles';
    style.textContent = `
      /* Make content harder to screenshot/screen-share clearly */
      .exam-secure-content {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      /* Watermark overlay */
      .exam-watermark::after {
        content: attr(data-watermark);
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        font-size: 4rem;
        color: rgba(255,255,255,0.03);
        pointer-events: none;
        z-index: 9999;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  // ─── EXTERNAL APP DETECTION ───────────────────────────────
  _registerExternalAppDetection() {
    if (!this.settings.blockExternalApps) return;

    // Method 1: Page Visibility + Window blur combination
    let blurTime = null;
    
    const blurDetect = () => {
      if (!this.isActive) return;
      blurTime = Date.now();
    };
    window.addEventListener('blur', blurDetect);
    
    const focusDetect = () => {
      if (!this.isActive || !blurTime) return;
      const awayDuration = Date.now() - blurTime;
      
      // If away for more than 2 seconds, likely used another app
      if (awayDuration > 2000) {
        this._reportViolation('external_app_detected', 
          `External application usage detected (away for ${Math.round(awayDuration/1000)}s)`, 'high');
        this.callbacks.onViolation?.({
          type: 'external_app_detected',
          message: `🚨 External application detected! You were away for ${Math.round(awayDuration/1000)} seconds. All activity is being monitored.`,
          requireAction: true,
        });
      }
      blurTime = null;
    };
    window.addEventListener('focus', focusDetect);

    // Method 2: Monitor for window.open attempts
    if (!this.originalWindowOpen) {
      this.originalWindowOpen = window.open;
    }
    window.open = (...args) => {
      if (this.isActive) {
        this._reportViolation('external_app_detected', 'Attempted to open new window', 'high');
        this.callbacks.onViolation?.({ type: 'external_app_detected', message: '⚠️ Opening new windows is not allowed during the exam.' });
        return null;
      }
      return this.originalWindowOpen.apply(window, args);
    };
  }

  // ─── SCREEN SHARING REGISTRATION ──────────────────────────
  _registerScreenSharingDetection() {
    if (!this.settings.preventScreenCapture) return;
    this._detectScreenSharing();
  }

  // Extensions cannot be forcibly disabled from a web app.
  // This check enforces policy by detecting common extension hooks/globals.
  _registerExtensionDetection() {
    if (!this.settings.disableExtensions) return;

    const detectExtensionSignals = () => {
      if (!this.isActive) return;

      const signals = [
        { key: '__REACT_DEVTOOLS_GLOBAL_HOOK__', label: 'React DevTools hook' },
        { key: '__VUE_DEVTOOLS_GLOBAL_HOOK__', label: 'Vue DevTools hook' },
        { key: '__REDUX_DEVTOOLS_EXTENSION__', label: 'Redux DevTools hook' },
        { key: '__REDUX_DEVTOOLS_EXTENSION_COMPOSE__', label: 'Redux DevTools compose hook' },
      ];

      signals.forEach((signal) => {
        if (window[signal.key] && !this.extensionFlagsSeen.has(signal.key)) {
          this.extensionFlagsSeen.add(signal.key);
          this._reportViolation('extension_detected', `Extension indicator detected: ${signal.label}`, 'high');
          this.callbacks.onViolation?.({
            type: 'extension_detected',
            message: 'Browser extension activity detected. Please disable extensions for this exam.',
            requireAction: true,
          });
        }
      });
    };

    detectExtensionSignals();
    this.extensionCheckInterval = setInterval(detectExtensionSignals, 10000);
  }

  // ─── SCREEN SHARING DETECTION ─────────────────────────────
  async _detectScreenSharing() {
    try {
      // Check if getDisplayMedia is being used (screen share)
      if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
        if (!this.originalGetDisplayMedia) {
          this.originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        }

        navigator.mediaDevices.getDisplayMedia = async (...args) => {
          if (this.isActive) {
            this._reportViolation('screen_share_detected', 'Screen sharing attempt', 'critical');
            this.callbacks.onViolation?.({ type: 'screen_share_detected', message: '🚨 Screen sharing is not allowed during exams!' });
            throw new Error('Screen sharing blocked by exam proctor');
          }
          return this.originalGetDisplayMedia.apply(navigator.mediaDevices, args);
        };
      }

      // Warn if display-capture permission is already active/allowed.
      // This helps surface a warning even if sharing started outside exam flow.
      if (navigator.permissions?.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'display-capture' });
        this.screenSharePermissionStatus = permissionStatus;

        const checkPermissionState = () => {
          if (!this.isActive || !this.screenSharePermissionStatus) return;

          if (this.screenSharePermissionStatus.state === 'granted') {
            if (!this.hasWarnedScreenSharePermission) {
              this.hasWarnedScreenSharePermission = true;
              this._reportViolation('screen_share_detected', 'Display capture permission is active', 'critical');
              this.callbacks.onViolation?.({
                type: 'screen_share_detected',
                message: '🚨 Screen sharing appears to be active. Stop sharing immediately to continue the exam.',
                requireAction: true,
                critical: true,
              });
            }
            return;
          }

          this.hasWarnedScreenSharePermission = false;
        };

        checkPermissionState();

        const permissionChangeHandler = () => checkPermissionState();
        permissionStatus.addEventListener?.('change', permissionChangeHandler);
        this.cleanupFns.push(() => {
          permissionStatus.removeEventListener?.('change', permissionChangeHandler);
        });

        this.screenSharePermissionPoll = setInterval(checkPermissionState, 4000);
      }
    } catch (e) {
      // Silently handle
    }
  }

  // ─── MULTIPLE MONITOR DETECTION ───────────────────────────
  _registerMultipleMonitorDetection() {
    // Use Screen API if available
    const checkScreens = async () => {
      if (!this.isActive) return;
      try {
        if (window.screen && window.screen.isExtended !== undefined) {
          if (window.screen.isExtended) {
            this._reportViolation('multiple_monitor', 'Multiple monitors detected', 'high');
            this.callbacks.onViolation?.({
              type: 'multiple_monitor',
              message: '⚠️ Multiple monitors detected! Please disconnect additional displays.',
              requireAction: true,
            });
          }
        }
        // Fallback: check if screen dimensions seem unusual
        if (window.screen.width > 3840 || window.screen.availWidth > window.screen.width) {
          this._reportViolation('multiple_monitor', 'Unusual screen dimensions - possible multi-monitor', 'medium');
        }
      } catch (e) {
        // Screen API not supported
      }
    };

    checkScreens();
    // Periodic re-check
    setInterval(checkScreens, 30000);
  }

  // ─── BROWSER RESIZE DETECTION ─────────────────────────────
  _registerBrowserResizeDetection() {
    let initialWidth = window.innerWidth;
    let initialHeight = window.innerHeight;

    const resizeHandler = () => {
      if (!this.isActive) return;
      const widthDiff = Math.abs(window.innerWidth - initialWidth);
      const heightDiff = Math.abs(window.innerHeight - initialHeight);
      
      // Significant resize might indicate moving to split screen
      if (widthDiff > 200 || heightDiff > 200) {
        this._reportViolation('browser_resize', 
          `Browser significantly resized (${widthDiff}x${heightDiff} change)`, 'medium');
        this.callbacks.onViolation?.({ 
          type: 'browser_resize', 
          message: '⚠️ Browser window resizing detected. Keep the exam in fullscreen.' 
        });
      }
    };

    window.addEventListener('resize', resizeHandler);
    this.handlers['window:resize'] = resizeHandler;
  }

  // ─── IDLE DETECTION ───────────────────────────────────────
  _registerIdleDetection() {
    const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    const WARNING_TIMEOUT = 4 * 60 * 1000; // 4 minutes

    const resetIdle = () => {
      this.lastActivity = Date.now();
      if (this.idleTimer) clearTimeout(this.idleTimer);
      if (this.idleWarningTimer) clearTimeout(this.idleWarningTimer);
      
      this.idleWarningTimer = setTimeout(() => {
        if (this.isActive) {
          this.callbacks.onViolation?.({ type: 'idle_warning', message: '⚠️ You have been idle for a while. Please continue your exam.' });
        }
      }, WARNING_TIMEOUT);

      this.idleTimer = setTimeout(() => {
        if (this.isActive) {
          this._reportViolation('idle_timeout', 'Student idle for extended period', 'high');
          this.callbacks.onViolation?.({ type: 'idle_timeout', message: '🚨 Idle timeout detected! Your activity is being monitored.', requireAction: true });
        }
      }, IDLE_TIMEOUT);
    };

    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetIdle, { passive: true });
    });
    resetIdle();
  }

  // ─── DISABLE TEXT SELECTION ───────────────────────────────
  _disableTextSelection() {
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
  }

  // ─── HEARTBEAT ────────────────────────────────────────────
  _startHeartbeat() {
    const sendHeartbeat = async () => {
      if (!this.isActive) return;
      try {
        const { data } = await api.post(`/proctor/heartbeat/${this.sessionId}`);
        if (data.status === 'terminated' || data.status === 'expired') {
          this.callbacks.onTerminated?.(data);
          this.stop();
        }
        this.callbacks.onHeartbeat?.(data);
      } catch (error) {
        console.warn('Heartbeat failed:', error);
      }
    };

    // Send immediately, then on interval
    void sendHeartbeat();
    this.heartbeatInterval = setInterval(sendHeartbeat, 30000); // Every 30 seconds
  }

  // ─── REPORT VIOLATION ─────────────────────────────────────
  async _reportViolation(type, details, severity = 'medium') {
    if (!this.isActive) return;

    const now = Date.now();
    const last = this.lastViolationAt[type] || 0;
    if (now - last < this.violationCooldownMs) {
      return;
    }
    this.lastViolationAt[type] = now;

    const violation = { type, details, severity, timestamp: new Date() };
    this.violations.push(violation);

    try {
      const { data } = await api.post(`/proctor/violation/${this.sessionId}`, {
        type, details, severity,
      });

      if (data.warning === 'EXAM_TERMINATED') {
        this.callbacks.onTerminated?.({ reason: 'Maximum violations exceeded' });
        this.stop();
      } else if (data.warning === 'APPROACHING_LIMIT') {
        this.callbacks.onViolation?.({
          type: 'approaching_limit',
          message: `⚠️ WARNING: You have ${data.remaining} violation(s) remaining before automatic termination!`,
          requireAction: true,
          critical: true,
        });
      }

      return data;
    } catch (error) {
      console.error('Failed to report violation:', error);
    }
  }

  // ─── UPDATE FULLSCREEN STATUS ─────────────────────────────
  async _updateFullscreenStatus(isFullscreen) {
    try {
      await api.post(`/proctor/fullscreen/${this.sessionId}`, { isFullscreen });
    } catch (error) {
      console.error('Failed to update fullscreen status:', error);
    }
  }

  // ─── GET VIOLATION SUMMARY ────────────────────────────────
  getViolationSummary() {
    const summary = {};
    this.violations.forEach(v => {
      summary[v.type] = (summary[v.type] || 0) + 1;
    });
    return { total: this.violations.length, byType: summary };
  }
}

export default ExamProctor;
