(() => {
  let askBusy = false;

  /*
   * The Apps Script bridge posts responses as:
   *   { nelBridge: true, payload: { ok, result/error, requestId } }
   * The approved app's original listener only looked for requestId at the
   * top level, so valid login responses were ignored until the 30s timeout.
   * Keep this compatibility listener after app.js so pending RPCs resolve.
   */
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.nelBridge !== true || !data.payload) return;
    if (typeof pending === 'undefined' || !pending) return;

    const payload = data.payload;
    const requestId = String(payload.requestId || '');
    if (!requestId || !pending.has(requestId)) return;

    const handle = pending.get(requestId);
    pending.delete(requestId);
    clearTimeout(handle.timer);
    try { handle.frame.remove(); } catch (_) {}
    try { handle.form.remove(); } catch (_) {}

    if (payload.ok) handle.resolve(payload.result);
    else handle.reject(new Error(payload.error || 'Request failed.'));
  });

  const hideQuickQuestions = () => {
    const block = document.getElementById('quickBlock');
    if (!block) return;
    block.classList.add('hidden');
    block.setAttribute('aria-hidden', 'true');
    block.querySelectorAll('.quickQ').forEach((button) => {
      button.disabled = true;
    });
  };

  const restoreQuickQuestions = () => {
    const block = document.getElementById('quickBlock');
    if (!block) return;
    block.classList.remove('hidden');
    block.removeAttribute('aria-hidden');
    block.querySelectorAll('.quickQ').forEach((button) => {
      button.disabled = false;
    });
  };

  const originalAnswerAsk = window.answerAsk;
  if (typeof originalAnswerAsk === 'function') {
    window.answerAsk = async function patchedAnswerAsk(type, question) {
      if (askBusy) return;
      askBusy = true;
      hideQuickQuestions();
      try {
        return await originalAnswerAsk.call(this, type, question);
      } finally {
        askBusy = false;
      }
    };
  }

  const originalResetAsk = window.resetAsk;
  if (typeof originalResetAsk === 'function') {
    window.resetAsk = function patchedResetAsk() {
      askBusy = false;
      const result = originalResetAsk.apply(this, arguments);
      restoreQuickQuestions();
      return result;
    };
  }

  document.addEventListener('click', (event) => {
    const quickQuestion = event.target.closest('.quickQ');
    if (!quickQuestion) return;
    if (askBusy) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    hideQuickQuestions();
  }, true);
})();
