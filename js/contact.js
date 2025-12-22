
(function() {
    const SCRIPT_URL =
        'https://script.google.com/macros/s/AKfycbwhkSGA6HcSvCljqBA91JmQVsVVUPU5LCEO1HlifB_Cjwc0DTFCK3m6hG5ZFDSgVHw9/exec';

    const form = document.querySelector('[data-contact-form]');
    if (!form) return;

    const statusEl = form.querySelector('[data-contact-status]');
    const statusText = statusEl?.querySelector('.contact-status__text');
    const counterEl = form.querySelector('[data-char-counter]');
    const messageInput = form.querySelector('#contact-message');
    const maxChars = Number(counterEl?.dataset.max || messageInput?.maxLength || 800);
    const submitBtn = form.querySelector('button[type="submit"]');

    if (counterEl) {
        counterEl.setAttribute('role', 'status');
        counterEl.setAttribute('aria-valuemax', maxChars.toString());
        counterEl.setAttribute('aria-valuemin', '0');
    }

    const validators = {
        name: (value) => {
            if (!value.trim()) return 'Name is required.';
            if (value.trim().length < 2) return 'Name should be at least 2 characters.';
            return '';
        },
        email: (value) => {
            if (!value.trim()) return 'Email is required.';
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(value.trim())) return 'Enter a valid email address.';
            return '';
        },
        subject: () => '',
        message: (value) => {
            if (!value.trim()) return 'Message is required.';
            if (value.trim().length < 10) return 'Add a little more detail (10+ characters).';
            return '';
        }
    };

    const clearValidation = () => {
        form.querySelectorAll('.is-invalid').forEach((node) => node.classList.remove('is-invalid'));
        form.querySelectorAll('.contact-error').forEach((node) => {
            node.textContent = '';
            node.hidden = true;
        });
    };

    const setStatus = (type, text) => {
        if (!statusEl || !statusText) return;
        statusEl.classList.remove('is-success', 'is-error');
        if (type === 'success') {
            statusEl.classList.add('is-success');
        } else if (type === 'error') {
            statusEl.classList.add('is-error');
        }
        statusText.textContent = text;
    };

    const ensureErrorNode = (fieldWrapper) => {
        let errorNode = fieldWrapper.querySelector('.contact-error');
        if (!errorNode) {
            errorNode = document.createElement('p');
            errorNode.className = 'contact-error';
            fieldWrapper.appendChild(errorNode);
        }
        return errorNode;
    };

    const validateField = (input) => {
        const fieldName = input.name;
        const validator = validators[fieldName];
        if (!validator) return true;

        const message = validator(input.value || '');
        const fieldWrapper = input.closest('.contact-field');
        if (!fieldWrapper) return true;

        const errorNode = ensureErrorNode(fieldWrapper);

        if (message) {
            input.classList.add('is-invalid');
            errorNode.textContent = message;
            errorNode.hidden = false;
            return false;
        }

        input.classList.remove('is-invalid');
        errorNode.textContent = '';
        errorNode.hidden = true;
        return true;
    };

    const updateCounter = () => {
        if (!counterEl || !messageInput) return;
        const current = messageInput.value.length;
        counterEl.textContent = `${current} / ${maxChars}`;
        counterEl.setAttribute('aria-valuenow', current.toString());
    };

    form.addEventListener('input', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches('#contact-message')) {
            updateCounter();
        }
        if (target.matches('input, textarea')) {
            validateField(target);
        }
    });

    form.addEventListener('blur', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.matches('input, textarea')) {
            validateField(target);
        }
    }, true);

    const sendForm = async () => {
        const formData = new FormData();
        formData.append('action', 'sendEmail');
        formData.append('name', form.name.value.trim());
        formData.append('email', form.email.value.trim());
        formData.append('subject', form.subject?.value.trim() || 'General message');
        formData.append('topics', form.subject?.value.trim() || 'General');
        formData.append('message', form.message.value.trim());

        try {
            submitBtn?.setAttribute('disabled', 'true');
            if (submitBtn) submitBtn.textContent = 'Sending...';
            setStatus('success', 'Sending your message...');

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: formData
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok && (data.success || data.result === 'success')) {
                setStatus('success', 'Message sent! I will reply to your email as soon as possible.');
                form.reset();
                clearValidation();
                updateCounter();
                return;
            }

            const errorMessage = data.error || 'There was a problem sending your message. Please try again later.';
            throw new Error(errorMessage);
        } catch (error) {
            const fallbackError = error instanceof Error ? error.message : 'Unexpected error occurred.';
            setStatus('error', `Could not send: ${fallbackError}`);
        } finally {
            if (submitBtn) {
                submitBtn.removeAttribute('disabled');
                submitBtn.textContent = 'Send transmission';
            }
        }
    };

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const inputs = Array.from(form.querySelectorAll('input, textarea'));
        const invalidFields = inputs.filter((input) => !validateField(input));

        if (invalidFields.length) {
            invalidFields[0].focus();
            setStatus('error', 'Please fix the highlighted fields and try again.');
            return;
        }

        sendForm();
    });

    updateCounter();
})();
