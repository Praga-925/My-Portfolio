function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeInput(value) {
  return String(value || '').replace(/[<>]/g, '').trim();
}

export function initFormHandler() {
  const form = document.getElementById('contact-form');
  const nameInput = document.getElementById('f-name');
  const emailInput = document.getElementById('f-email');
  const messageInput = document.getElementById('f-msg');
  const successEl = document.getElementById('f-success');
  const errorEl = document.getElementById('f-error');
  const submitBtn = document.getElementById('form-submit');

  if (!form || !nameInput || !emailInput || !messageInput || !successEl || !errorEl || !submitBtn) return;

  function setLoading(isLoading) {
    submitBtn.classList.toggle('is-loading', isLoading);
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? 'Sending...' : 'Send Message_';
  }

  function setError(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    successEl.style.display = 'none';
  }

  function setSuccess() {
    successEl.style.display = 'block';
    errorEl.style.display = 'none';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = normalizeInput(nameInput.value);
    const email = normalizeInput(emailInput.value);
    const message = normalizeInput(messageInput.value);

    if (name.length < 2 || name.length > 80) {
      setError('Please enter a valid name (2-80 characters).');
      return;
    }

    if (!isValidEmail(email) || email.length > 140) {
      setError('Please enter a valid email address.');
      return;
    }

    if (message.length < 10 || message.length > 2000) {
      setError('Message must be between 10 and 2000 characters.');
      return;
    }

    setLoading(true);
    successEl.style.display = 'none';
    errorEl.style.display = 'none';

    try {
      const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      const useNetlify = form.hasAttribute('data-netlify') && !isLocalhost;
      const endpoint = useNetlify ? (form.getAttribute('action') || '/') : '/api/contact';
      const headers = useNetlify
        ? { 'Content-Type': 'application/x-www-form-urlencoded' }
        : { 'Content-Type': 'application/json' };
      const body = useNetlify
        ? new URLSearchParams({
          'form-name': form.getAttribute('name') || 'contact',
          name,
          email,
          message
        })
        : JSON.stringify({ name, email, message });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await response.json() : null;
        setError(payload?.error || 'Unable to send message right now. Please try again later.');
        return;
      }

      setSuccess();
      form.reset();
      setTimeout(() => {
        successEl.style.display = 'none';
      }, 4000);
    } catch {
      setError('Network error. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  });
}
