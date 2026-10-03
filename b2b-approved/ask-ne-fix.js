(() => {
  let askBusy = false;

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
