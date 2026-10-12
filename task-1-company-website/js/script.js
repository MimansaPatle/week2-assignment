/* ==========================================================================
   TULIP & TWINE — Handmade Creative Studio
   Plain vanilla JS, no build step, no external requests. One file is shared
   by all four pages; each block below is independent and guards for the
   elements it needs before doing anything.

   The current page's nav link is marked in the HTML itself (is-active and
   aria-current="page"), so it does not depend on this script.
   ========================================================================== */

(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     1. MOBILE NAVIGATION
     ------------------------------------------------------------------------ */
  (() => {
    const toggle = document.getElementById('mobile-toggle');
    const menu = document.getElementById('nav-menu');
    if (!toggle || !menu) return;

    const closeMenu = () => {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
      menu.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    };

    toggle.addEventListener('click', () => {
      if (menu.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // picking a page closes the menu before the browser leaves this one
    menu.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    // Escape closes the menu and returns focus to the toggle
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        closeMenu();
        toggle.focus();
      }
    });

    // a tap outside the open menu closes it
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('is-open')) return;
      if (menu.contains(e.target) || toggle.contains(e.target)) return;
      closeMenu();
    });

    // crossing back to the desktop layout always leaves the menu closed
    // (769px, because the CSS switches to the mobile menu at max-width: 768px)
    window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => {
      if (e.matches) closeMenu();
    });
  })();

  /* ------------------------------------------------------------------------
     2. SCROLL REVEAL
     ------------------------------------------------------------------------ */
  (() => {
    const items = document.querySelectorAll('.scroll-reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    // threshold 0: a section is revealed as soon as its top edge is 60px into
    // view. A percentage threshold would never be met by a section that is
    // much taller than a small phone screen, leaving it invisible.
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -60px 0px' });

    items.forEach((el) => observer.observe(el));
  })();

  /* ------------------------------------------------------------------------
     3. CUSTOM ORDER FORM — accessible client-side validation
        This is a demo form: nothing is sent anywhere.
     ------------------------------------------------------------------------ */
  (() => {
    const form = document.getElementById('order-form');
    const feedback = document.getElementById('order-feedback');
    if (!form || !feedback) return;

    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const MESSAGE_MIN = 20;
    const MESSAGE_MAX = 1000;

    // one rule per field: takes the trimmed value, returns an error message or ''
    const rules = {
      'order-name': (value) => {
        if (!value) return 'Please enter your full name.';
        if (value.length < 2) return 'Your name needs at least 2 characters.';
        return '';
      },
      'order-email': (value) => {
        if (!value) return 'Please enter your email address.';
        if (!EMAIL.test(value)) return 'Enter a valid email, like name@example.com.';
        return '';
      },
      'order-phone': (value) => {
        if (!value) return '';
        const digits = value.replace(/\D/g, '').length;
        const looksLikePhone = /^\+?[\d\s().-]+$/.test(value) && digits >= 7 && digits <= 15;
        return looksLikePhone ? '' : 'Enter a valid phone number, or leave it empty.';
      },
      'order-type': (value) => (value ? '' : 'Please choose what your message is about.'),
      'order-message': (value) => {
        if (!value) return 'Please write a message.';
        if (value.length < MESSAGE_MIN) {
          return `Write at least ${MESSAGE_MIN} characters (${value.length} so far).`;
        }
        if (value.length > MESSAGE_MAX) return `Please keep your message under ${MESSAGE_MAX} characters.`;
        return '';
      },
    };

    const fields = Object.keys(rules).map((id) => document.getElementById(id)).filter(Boolean);

    const errorElementFor = (field) => document.getElementById(`${field.id}-error`);

    // shows or clears one field's error; returns true when the field is valid
    const validateField = (field) => {
      const message = rules[field.id](field.value.trim());
      const errorElement = errorElementFor(field);

      if (message) {
        field.setAttribute('aria-invalid', 'true');
      } else {
        field.removeAttribute('aria-invalid');
      }
      if (errorElement) errorElement.textContent = message;

      return !message;
    };

    const showFeedback = (kind, message) => {
      feedback.className = `form-feedback is-visible form-feedback--${kind}`;
      feedback.textContent = message;
    };

    const hideFeedback = () => {
      feedback.className = 'form-feedback';
      feedback.textContent = '';
    };

    // check a field when the visitor leaves it, and keep an existing error
    // up to date while they correct it
    fields.forEach((field) => {
      field.addEventListener('blur', () => validateField(field));
      field.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    // live character count under the message box
    const message = document.getElementById('order-message');
    const counter = document.getElementById('order-message-count');
    const updateCounter = () => {
      if (message && counter) counter.textContent = message.value.trim().length;
    };
    if (message) message.addEventListener('input', updateCounter);

    // a link such as contact.html?craft=clay opens the form with that craft chosen
    const typeSelect = document.getElementById('order-type');
    const requestedCraft = new URLSearchParams(window.location.search).get('craft');
    if (typeSelect && requestedCraft) {
      const match = Array.from(typeSelect.options).find((option) => option.value === requestedCraft);
      if (match) typeSelect.value = requestedCraft;
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const invalid = fields.filter((field) => !validateField(field));

      if (invalid.length) {
        const count = invalid.length === 1 ? '1 field needs' : `${invalid.length} fields need`;
        showFeedback('error', `${count} your attention. Please check the messages above.`);
        invalid[0].focus();
        return;
      }

      const name = document.getElementById('order-name').value.trim();
      const topic = typeSelect.options[typeSelect.selectedIndex].text.toLowerCase();

      form.reset();
      updateCounter();
      showFeedback('success', `Thanks, ${name}! Your ${topic} request passed every check. This is a demo form, so nothing was sent or saved.`);
      feedback.focus();
    });

    // editing again after a result clears the old message
    form.addEventListener('input', () => {
      if (feedback.classList.contains('form-feedback--success')) hideFeedback();
    });
  })();

})();
