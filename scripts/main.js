// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM fully loaded and parsed');

    // Example: Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Example: Mobile menu toggle (if you have a mobile menu)
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
        });
    }

    // Example: Lazy loading images (if you have many images)
    const lazyImages = document.querySelectorAll('img.lazy');
    
    if ('IntersectionObserver' in window) {
        let lazyImageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    let lazyImage = entry.target;
                    lazyImage.src = lazyImage.dataset.src;
                    lazyImage.classList.remove('lazy');
                    lazyImageObserver.unobserve(lazyImage);
                }
            });
        });

        lazyImages.forEach((lazyImage) => {
            lazyImageObserver.observe(lazyImage);
        });
    }

    // You can add more general JavaScript functionality here
});

// Example: Function to add new game cards dynamically
function addGameCard(title, imageUrl, gameUrl) {
    const gameList = document.querySelector('.game-list');
    
    const gameCard = document.createElement('a');
    gameCard.href = gameUrl;
    gameCard.className = 'game-card';

    const gameImage = document.createElement('div');
    gameImage.className = 'game-image';
    gameImage.style.backgroundImage = `url('${imageUrl}')`;

    const gameTitle = document.createElement('h3');
    gameTitle.textContent = title;

    gameCard.appendChild(gameImage);
    gameCard.appendChild(gameTitle);
    gameList.appendChild(gameCard);
}

// Usage example:
// addGameCard('New Game', 'path/to/image.png', 'games/newgame/newgame.html');