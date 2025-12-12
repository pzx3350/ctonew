let photoFile = null;
let musicFile = null;

const starfieldCanvas = document.getElementById('starfield');
const starfieldCtx = starfieldCanvas.getContext('2d');
const fireworksCanvas = document.getElementById('fireworks');
const fireworksCtx = fireworksCanvas.getContext('2d');
const giftButton = document.getElementById('giftButton');
const giftContainer = document.getElementById('giftContainer');
const photoContainer = document.getElementById('photoContainer');
const birthdayPhoto = document.getElementById('birthdayPhoto');
const birthdayMusic = document.getElementById('birthdayMusic');
const uploadSection = document.getElementById('uploadSection');
const photoUpload = document.getElementById('photoUpload');
const musicUpload = document.getElementById('musicUpload');
const startButton = document.getElementById('startButton');

starfieldCanvas.width = window.innerWidth;
starfieldCanvas.height = window.innerHeight;
fireworksCanvas.width = window.innerWidth;
fireworksCanvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    starfieldCanvas.width = window.innerWidth;
    starfieldCanvas.height = window.innerHeight;
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
    initStars();
});

class Star {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * starfieldCanvas.width;
        this.y = Math.random() * starfieldCanvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speed = Math.random() * 0.5 + 0.1;
        this.opacity = Math.random();
        this.fadeDirection = Math.random() > 0.5 ? 1 : -1;
    }
    
    update() {
        this.y += this.speed;
        this.opacity += this.fadeDirection * 0.01;
        
        if (this.opacity <= 0 || this.opacity >= 1) {
            this.fadeDirection *= -1;
        }
        
        if (this.y > starfieldCanvas.height) {
            this.y = 0;
            this.x = Math.random() * starfieldCanvas.width;
        }
    }
    
    draw() {
        starfieldCtx.beginPath();
        starfieldCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        starfieldCtx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        starfieldCtx.fill();
    }
}

let stars = [];

function initStars() {
    stars = [];
    const starCount = Math.floor((starfieldCanvas.width * starfieldCanvas.height) / 3000);
    for (let i = 0; i < starCount; i++) {
        stars.push(new Star());
    }
}

function animateStarfield() {
    starfieldCtx.clearRect(0, 0, starfieldCanvas.width, starfieldCanvas.height);
    
    stars.forEach(star => {
        star.update();
        star.draw();
    });
    
    requestAnimationFrame(animateStarfield);
}

initStars();
animateStarfield();

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = {
            x: (Math.random() - 0.5) * 8,
            y: (Math.random() - 0.5) * 8
        };
        this.radius = Math.random() * 3 + 2;
        this.alpha = 1;
        this.decay = Math.random() * 0.015 + 0.015;
    }
    
    update() {
        this.velocity.y += 0.1;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= this.decay;
    }
    
    draw() {
        fireworksCtx.save();
        fireworksCtx.globalAlpha = this.alpha;
        fireworksCtx.beginPath();
        fireworksCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        fireworksCtx.fillStyle = this.color;
        fireworksCtx.fill();
        fireworksCtx.restore();
    }
}

class Firework {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.targetY = y;
        this.launched = false;
        this.particles = [];
        this.exploded = false;
    }
    
    explode() {
        const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3', '#ff1493', '#00ffff', '#ff69b4'];
        const particleCount = 100;
        
        for (let i = 0; i < particleCount; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push(new Particle(this.x, this.y, color));
        }
        
        this.exploded = true;
    }
    
    update() {
        if (!this.exploded) {
            this.explode();
        }
        
        this.particles = this.particles.filter(particle => particle.alpha > 0);
        
        this.particles.forEach(particle => {
            particle.update();
        });
    }
    
    draw() {
        this.particles.forEach(particle => {
            particle.draw();
        });
    }
    
    isDone() {
        return this.particles.length === 0;
    }
}

let fireworks = [];
let fireworksActive = false;

function animateFireworks() {
    if (!fireworksActive) return;
    
    fireworksCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    fireworksCtx.fillRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    
    fireworks = fireworks.filter(firework => !firework.isDone());
    
    fireworks.forEach(firework => {
        firework.update();
        firework.draw();
    });
    
    if (fireworks.length > 0 || fireworksActive) {
        requestAnimationFrame(animateFireworks);
    } else {
        fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    }
}

function launchFireworks() {
    fireworksActive = true;
    fireworks = [];
    
    const fireworkCount = 15;
    let launched = 0;
    
    const launchInterval = setInterval(() => {
        if (launched < fireworkCount) {
            const x = Math.random() * fireworksCanvas.width;
            const y = Math.random() * fireworksCanvas.height * 0.5 + fireworksCanvas.height * 0.1;
            fireworks.push(new Firework(x, y));
            launched++;
        } else {
            clearInterval(launchInterval);
            setTimeout(() => {
                fireworksActive = false;
                showPhoto();
            }, 3000);
        }
    }, 200);
    
    animateFireworks();
}

function showPhoto() {
    photoContainer.classList.remove('hidden');
    setTimeout(() => {
        photoContainer.classList.add('show');
    }, 100);
    
    if (musicFile) {
        birthdayMusic.play().catch(err => {
            console.log('音乐播放失败:', err);
        });
    }
}

photoUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        photoFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            birthdayPhoto.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

musicUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        musicFile = file;
        const url = URL.createObjectURL(file);
        birthdayMusic.src = url;
    }
});

startButton.addEventListener('click', () => {
    if (!photoFile) {
        alert('请上传照片！');
        return;
    }
    
    uploadSection.classList.add('hidden');
});

giftButton.addEventListener('click', () => {
    giftContainer.classList.add('hidden');
    launchFireworks();
});
