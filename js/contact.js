(function() {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;

    const statusEl = form.querySelector('[data-contact-status]');
    const statusText = statusEl?.querySelector('.contact-status__text');
    const counterEl = form.querySelector('[data-char-counter]');
    const messageInput = form.querySelector('#contact-message');
    const maxChars = Number(counterEl?.dataset.max || messageInput?.maxLength || 800);

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

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const inputs = Array.from(form.querySelectorAll('input, textarea'));
        const invalidFields = inputs.filter((input) => !validateField(input));

        if (invalidFields.length) {
            invalidFields[0].focus();
            setStatus('error', 'Please fix the highlighted fields and try again.');
            return;
        }

        setStatus('success', 'Message staged! I will reply to your email as soon as possible.');
        form.reset();
        clearValidation();
        updateCounter();
    });

    updateCounter();
})();
