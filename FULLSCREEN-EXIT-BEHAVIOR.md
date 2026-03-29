# Fullscreen Exit Behavior - How It Works

## ✅ Current Implementation

### Exit Allowance: 8 Chances

Students can exit fullscreen **8 times** before the exam is terminated.

### What Happens on Each Exit:

#### Exits 1-7: Warning with Countdown
- Modal appears: "YOU EXITED FULLSCREEN MODE! (Exit X/8) - Y chances remaining"
- 30-second countdown starts
- Student must click "Re-enter Fullscreen Mode" button
- If they re-enter within 30 seconds: Exam continues
- If 30 seconds pass: Exam terminates automatically

#### Exit 8: Final Warning
- Modal appears: "FINAL WARNING! This is your last chance!"
- 30-second countdown starts
- Student must click "Re-enter Fullscreen Mode" button
- If they re-enter within 30 seconds: Exam continues
- If 30 seconds pass: Exam terminates automatically

#### Exit 9+: Immediate Termination
- No countdown, no modal
- Exam terminates immediately
- Message: "You exited fullscreen 9 times. Maximum allowed is 8."

## 🔍 Debugging Steps

If the exam is terminating immediately without showing the modal:

### 1. Check Browser Console

Open browser console (F12) and look for these messages:
```
🚨 Fullscreen exit detected! Count: X/8
📢 Showing fullscreen exit modal: ...
⏱ Fullscreen countdown: 30 seconds remaining
⏱ Fullscreen countdown: 29 seconds remaining
...
```

If you see:
- `❌ Maximum fullscreen exits exceeded` - You've already exited 9+ times
- `❌ 30 seconds elapsed - terminating exam` - Countdown finished

### 2. Check Exam Settings

The exam might have `strictFullscreen` enabled which changes behavior. Check the exam settings when creating the exam.

### 3. Test Locally

Run locally to see console logs:

```bash
# Terminal 1
cd server
npm start

# Terminal 2
cd client
npm start
```

Then take an exam and exit fullscreen. Watch the console for logs.

## 🐛 Known Issues

### Issue: Exam terminates immediately without countdown

**Possible Causes:**

1. **Already exceeded 8 exits**: The counter persists for the session. If you've already exited 8 times, the 9th exit terminates immediately.

2. **Modal not visible**: The modal might be behind other elements. Check z-index.

3. **Countdown not updating**: The `onFullscreenCountdown` callback might not be firing.

4. **Browser blocking fullscreen**: Some browsers don't support fullscreen API properly.

### Solution:

The latest code update includes:
- Console logging for debugging
- Fixed countdown logic (uses countdown variable instead of elapsed time)
- Better modal messaging
- Clearer remaining chances display

## 📝 Testing Checklist

To verify it works:

- [ ] Start an exam
- [ ] Exit fullscreen (press ESC)
- [ ] Modal should appear with "Exit 1 of 8 - 7 chances remaining"
- [ ] Countdown should show: 30, 29, 28...
- [ ] Click "Re-enter Fullscreen Mode" button
- [ ] Exam should continue
- [ ] Repeat 7 more times
- [ ] On 9th exit: Immediate termination

## 🔧 Quick Fix

If still having issues, try:

1. **Clear browser cache** and reload
2. **Check console logs** for errors
3. **Verify exam settings** don't have `strictFullscreen: true`
4. **Test in incognito mode** to rule out extensions

## 📞 Support

If the issue persists after redeploying:
1. Check browser console for the log messages
2. Verify the modal is appearing (check z-index)
3. Test with different browsers (Chrome, Firefox, Edge)
4. Ensure you're clicking the "Re-enter Fullscreen" button within 30 seconds
