//金子
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. スクロールアニメーション (Intersection Observer)
    // ==========================================
    const animElements = document.querySelectorAll('.scroll-anim');

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.1
    };

    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    animElements.forEach(el => scrollObserver.observe(el));

 