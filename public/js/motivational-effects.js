document.addEventListener('DOMContentLoaded', function() {
    const animateElements = document.querySelectorAll('.card, .btn, .alert');
    animateElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        setTimeout(() => {
            element.style.transition = 'all 0.5s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 100);
    });
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.05)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    const counters = document.querySelectorAll('.h5, .h4, .h3');
    counters.forEach(counter => {
        const target = parseInt(counter.innerText);
        if (!isNaN(target) && target > 0) {
            animateCounter(counter, target);
        }
    });
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.classList.add('btn-loading');
                submitBtn.disabled = true;
            }
        });
    });
    const deleteButtons = document.querySelectorAll('button[onclick*="confirm"], form[onsubmit*="confirm"]');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (!confirm('¿Estás seguro? Esta acción no se puede deshacer.')) {
                e.preventDefault();
                return false;
            }
        });
    });
    const tooltipElements = document.querySelectorAll('[title]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            showMotivationalTooltip(this);
        });
    });
    const searchInputs = document.querySelectorAll('input[type="search"], input[name="search"]');
    searchInputs.forEach(input => {
        input.addEventListener('input', function() {
            this.style.borderColor = '#28a745';
            this.style.boxShadow = '0 0 5px rgba(40, 167, 69, 0.3)';
        });
    });
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateInputVisually(this);
        });
    });
});

function animateCounter(element, target) {
    let current = 0;
    const increment = target / 100;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.innerText = Math.floor(current);
    }, 20);
}

function showMotivationalTooltip(element) {
    const messages = [
        '¡Excelente trabajo!',
        '¡Sigue así!',
        '¡Eres increíble!',
        '¡Gran sistema!',
        '¡Node.js es genial!',
        '¡PostgreSQL rocks!'
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    element.setAttribute('data-original-title', element.title);
    element.title = randomMessage;
    setTimeout(() => {
        element.title = element.getAttribute('data-original-title') || '';
    }, 2000);
}

function validateInputVisually(input) {
    if (input.checkValidity()) {
        input.style.borderColor = '#28a745';
        input.style.boxShadow = '0 0 5px rgba(40, 167, 69, 0.3)';
        if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('validation-icon')) {
            const checkmark = document.createElement('i');
            checkmark.className = 'fas fa-check validation-icon text-success';
            checkmark.style.position = 'absolute';
            checkmark.style.right = '10px';
            checkmark.style.top = '50%';
            checkmark.style.transform = 'translateY(-50%)';
            input.parentElement.style.position = 'relative';
            input.parentElement.appendChild(checkmark);
        }
    } else {
        input.style.borderColor = '#dc3545';
        input.style.boxShadow = '0 0 5px rgba(220, 53, 69, 0.3)';
    }
}

function celebrateSuccess() {
    for (let i = 0; i < 50; i++) {
        createParticle();
    }
}

function createParticle() {
    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.width = '10px';
    particle.style.height = '10px';
    particle.style.background = `hsl(${Math.random() * 360}, 100%, 50%)`;
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '9999';
    particle.style.left = Math.random() * window.innerWidth + 'px';
    particle.style.top = Math.random() * window.innerHeight + 'px';
    document.body.appendChild(particle);
    particle.animate([
        { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
        { transform: 'translateY(-100px) rotate(360deg)', opacity: 0 }
    ], {
        duration: 2000,
        easing: 'ease-out'
    }).onfinish = () => {
        particle.remove();
    };
}

function showEnergeticNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} position-fixed`;
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${message}
        <button type="button" class="btn-close float-end" onclick="this.parentElement.remove()"></button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

window.celebrateSuccess = celebrateSuccess;
window.showEnergeticNotification = showEnergeticNotification;