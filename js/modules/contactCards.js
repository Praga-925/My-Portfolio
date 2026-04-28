export function initContactCards() {
  const emailCard = document.querySelector('.contact-card-email');
  if (!emailCard) return;

  const email = emailCard.dataset.email;
  if (!email) return;

  const gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(email);

  emailCard.addEventListener('click', (event) => {
    event.preventDefault();
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  });

  emailCard.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    }
  });
}
