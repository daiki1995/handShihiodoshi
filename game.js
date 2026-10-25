        class AudioSynth {
            constructor() {
                this.ctx = null;
                this.isPouring = false;
                this.pourNode = null;
                this.pourGain = null;
            }

            init() {
                if (!this.ctx) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.ctx = new AudioContext();
                }
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
            }

            // Continuous noise generator for pouring water
            startPourSound() {
                if (!this.ctx || this.isPouring) return;
                this.isPouring = true;

                const bufferSize = this.ctx.sampleRate * 2;
                const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }

                const noise = this.ctx.createBufferSource();
                noise.buffer = buffer;
                noise.loop = true;

                // Lowpass filter to simulate water gurgle
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(800, this.ctx.currentTime);
                filter.Q.setValueAtTime(3, this.ctx.currentTime);

                this.pourGain = this.ctx.createGain();
                this.pourGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
                this.pourGain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 0.1);

                noise.connect(filter);
                filter.connect(this.pourGain);
                this.pourGain.connect(this.ctx.destination);

                noise.start();
                this.pourNode = noise;
            }

            stopPourSound() {
                if (!this.isPouring) return;
                this.isPouring = false;
                if (this.pourGain && this.ctx) {
                    this.pourGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
                    setTimeout(() => {
                        if (this.pourNode) {
                            try { this.pourNode.stop(); } catch(e){}
                            this.pourNode.disconnect();
                            this.pourNode = null;
                        }
                    }, 100);
                }
            }

            // Sharp woody impact sound ("カツン！")
            playStrikeSound() {
                if (!this.ctx) return;
                const now = this.ctx.currentTime;

                // 1. Wooden body impact tone
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

                gain.gain.setValueAtTime(0.8, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.15);

                // 2. High frequency sharp click (bamboo snap)
                const clickOsc = this.ctx.createOscillator();
                const clickGain = this.ctx.createGain();
                clickOsc.type = 'sine';
                clickOsc.frequency.setValueAtTime(2400, now);
                clickOsc.frequency.exponentialRampToValueAtTime(800, now + 0.04);

                clickGain.gain.setValueAtTime(0.6, now);
                clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

                clickOsc.connect(clickGain);
                clickGain.connect(this.ctx.destination);
                clickOsc.start(now);
                clickOsc.stop(now + 0.05);
            }

            // Critical Hit Jingle
            playCriticalSound() {
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                
                notes.forEach((freq, idx) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.05);

                    gain.gain.setValueAtTime(0.25, now + idx * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start(now + idx * 0.05);
                    osc.stop(now + idx * 0.05 + 0.25);
                });
            }

            // Normal Scare Sound
            playScareSound() {
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);

                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
            }

            // Damage taken sound
            playDamageSound() {
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.linearRampToValueAtTime(50, now + 0.3);

                gain.gain.setValueAtTime(0.4, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        }

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const audio = new AudioSynth();
        const bgm = new Audio('BGM.mp3');
        bgm.loop = true;
        bgm.volume = 0.3;

        // Game State Variables
        let gameState = 'TITLE'; // TITLE, PLAYING, GAMEOVER
        let score = 0;
        let highScore = parseInt(localStorage.getItem('shishi_highscore') || '0', 10);
        let combo = 0;
        let maxCombo = 0;
        let lives = 3;

        // Mechanics & Hydraulics State
        let isPouringInput = false;
        let petWaterLevel = 100; // 0 to 100
        let petAngle = 0; // Current PET bottle tilt angle
        let bambooWater = 0; // 0 to 100
        let bambooAngle = 0; // Visual angle of tilt
        let isStriking = false; // Strike animation in progress
        let strikeProgress = 0; // 0 to 1

        // Shockwaves & Particles Container
        let shockwaves = [];
        let particles = [];
        let floatTexts = [];
        let animals = [];
        let sakuraPetals = [];

        // Coordinates & Key Locations on 960x540 Canvas
        const BAMBOO_PIVOT = { x: 200, y: 340 };
        const ROCK_POS = { x: 250, y: 385 };
        const PET_POS = { x: 155, y: 170 };
        const DANGER_X = 170; // Animal reaching here causes life loss

        // Zone Thresholds relative to Rock (X coordinates)
        const JUST_ZONE_MIN = 220;
        const JUST_ZONE_MAX = 380;
        const CAUTION_ZONE_MAX = 720;

        // Spawning Timers
        let spawnTimer = 0;
        let nextSpawnInterval = 120; // Frames

        class Animal {
            constructor(type) {
                this.type = type; // 'DEER', 'RABBIT', 'LION'
                this.x = 980;
                this.y = 380;
                this.vx = 0;
                this.vy = 0;
                this.state = 'APPROACH'; // APPROACH, SCARED_FLIET, SCARED_RUN
                this.animFrame = Math.random() * 100;

                if (type === 'DEER') {
                    this.speed = 2.0 + Math.random() * 0.6;
                    this.radius = 28;
                    this.basePoints = 300;
                    this.color = '#c28d53';
                    this.name = 'シカ';
                } else if (type === 'RABBIT') {
                    this.speed = 3.6 + Math.random() * 0.8;
                    this.radius = 20;
                    this.basePoints = 500;
                    this.color = '#f3f4f6';
                    this.name = 'ウサギ';
                } else if (type === 'LION') {
                    this.speed = 1.2 + Math.random() * 0.3;
                    this.radius = 38;
                    this.basePoints = 1000;
                    this.color = '#eab308';
                    this.name = 'ライオン';
                }
            }

            update() {
                this.animFrame++;

                if (this.state === 'APPROACH') {
                    this.x -= this.speed;
                    // Rabbit hopping motion
                    if (this.type === 'RABBIT') {
                        this.y = 380 - Math.abs(Math.sin(this.animFrame * 0.2)) * 14;
                    } else {
                        this.y = 380;
                    }
                } else if (this.state === 'SCARED_FLIET') {
                    // Critical hit launch physics
                    this.x += this.vx;
                    this.y += this.vy;
                    this.vy += 0.5; // Gravity
                } else if (this.state === 'SCARED_RUN') {
                    // Turn around and run away fast
                    this.x += this.speed * 2.5;
                }
            }

            draw(ctx) {
                ctx.save();
                ctx.translate(this.x, this.y);

                if (this.state === 'SCARED_FLIET') {
                    ctx.rotate((this.animFrame * 0.2));
                }

                if (this.type === 'DEER') {
                    this.drawDeer(ctx);
                } else if (this.type === 'RABBIT') {
                    this.drawRabbit(ctx);
                } else if (this.type === 'LION') {
                    this.drawLion(ctx);
                }

                ctx.restore();
            }

            drawDeer(ctx) {
                // Body
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.ellipse(0, -15, 26, 18, 0, 0, Math.PI * 2);
                ctx.fill();

                // Spots
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(-8, -18, 3, 0, Math.PI * 2);
                ctx.arc(4, -22, 2.5, 0, Math.PI * 2);
                ctx.arc(8, -12, 3, 0, Math.PI * 2);
                ctx.fill();

                // Head
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.ellipse(-20, -32, 12, 10, -0.2, 0, Math.PI * 2);
                ctx.fill();

                // Antlers
                ctx.strokeStyle = '#5c3a21';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-22, -40);
                ctx.lineTo(-28, -52);
                ctx.moveTo(-26, -47);
                ctx.lineTo(-20, -49);
                ctx.stroke();

                // Legs
                const legOffset = Math.sin(this.animFrame * 0.2) * 8;
                ctx.strokeStyle = '#9a6a38';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(-12, 0); ctx.lineTo(-12 + legOffset, 18);
                ctx.moveTo(12, 0); ctx.lineTo(12 - legOffset, 18);
                ctx.stroke();

                // Eyes
                this.drawFace(ctx, -24, -34);
            }

            drawRabbit(ctx) {
                // Body
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.ellipse(0, -10, 18, 14, 0, 0, Math.PI * 2);
                ctx.fill();

                // Ears
                ctx.fillStyle = '#fbeee0';
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(-6, -28, 4, 12, -0.1, 0, Math.PI * 2);
                ctx.ellipse(4, -28, 4, 12, 0.1, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();

                // Head
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(-12, -18, 11, 0, Math.PI * 2);
                ctx.fill();

                // Eyes & Face
                this.drawFace(ctx, -15, -20);
            }

            drawLion(ctx) {
                // Mane
                ctx.fillStyle = '#b45309';
                ctx.beginPath();
                ctx.arc(-22, -28, 24, 0, Math.PI * 2);
                ctx.fill();

                // Body
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.ellipse(4, -18, 32, 22, 0, 0, Math.PI * 2);
                ctx.fill();

                // Head
                ctx.beginPath();
                ctx.arc(-22, -28, 16, 0, Math.PI * 2);
                ctx.fill();

                // Legs
                const legOffset = Math.sin(this.animFrame * 0.15) * 6;
                ctx.fillStyle = '#d97706';
                ctx.fillRect(-15 + legOffset, -2, 8, 20);
                ctx.fillRect(15 - legOffset, -2, 8, 20);

                // Face
                this.drawFace(ctx, -26, -30);
            }

            drawFace(ctx, x, y) {
                if (this.state === 'SCARED_FLIET') {
                    // Shocked Eyes (Big spiral / cross)
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, Math.PI * 2);
                    ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 3, y + 3);
                    ctx.moveTo(x + 3, y - 3); ctx.lineTo(x - 3, y + 3);
                    ctx.stroke();
                } else {
                    // Normal Cute Eye
                    ctx.fillStyle = '#1e293b';
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        class FloatText {
            constructor(x, y, text, color, isCritical = false) {
                this.x = x;
                this.y = y;
                this.text = text;
                this.color = color;
                this.isCritical = isCritical;
                this.life = 1.0; // 1.0 to 0
                this.vy = -2.0;
            }

            update() {
                this.y += this.vy;
                this.life -= 0.02;
            }

            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.life);
                ctx.font = this.isCritical ? '900 28px "Zen Maru Gothic"' : '700 20px "Zen Maru Gothic"';
                ctx.fillStyle = this.color;
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4;
                ctx.textAlign = 'center';
                ctx.strokeText(this.text, this.x, this.y);
                ctx.fillText(this.text, this.x, this.y);
                ctx.restore();
            }
        }

        class Particle {
            constructor(x, y, color, speed, size) {
                this.x = x;
                this.y = y;
                this.color = color;
                this.vx = (Math.random() - 0.5) * speed;
                this.vy = (Math.random() - 0.8) * speed;
                this.size = size;
                this.life = 1.0;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.vy += 0.2; // Gravity
                this.life -= 0.03;
            }

            draw(ctx) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.life);
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // Initialize Sakura Petals for serene background vibe
        for (let i = 0; i < 25; i++) {
            sakuraPetals.push({
                x: Math.random() * 960,
                y: Math.random() * 540,
                speedX: -0.5 - Math.random() * 0.8,
                speedY: 0.5 + Math.random() * 0.8,
                rotation: Math.random() * Math.PI * 2,
                size: 4 + Math.random() * 4
            });
        }

        const touchZone = document.getElementById('touchZone');
        const startButton = document.getElementById('startButton');
        const restartButton = document.getElementById('restartButton');
        const bottleRefillButton = document.getElementById('bottleRefillButton');

        function handleInputStart(e) {
            if (e) e.preventDefault();
            audio.init();
            if (gameState === 'PLAYING') {
                isPouringInput = true;
            }
        }

        function handleInputEnd(e) {
            if (e) e.preventDefault();
            isPouringInput = false;
        }

        // Mouse & Touch events
        window.addEventListener('mousedown', (e) => {
            if (e.target.tagName !== 'BUTTON') handleInputStart(e);
        });
        window.addEventListener('mouseup', handleInputEnd);

        touchZone.addEventListener('touchstart', handleInputStart, { passive: false });
        touchZone.addEventListener('touchend', handleInputEnd, { passive: false });

        // Keyboard Controls (Spacebar)
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.repeat) {
                handleInputStart();
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                handleInputEnd();
            }
        });

        // Start & Restart buttons
        startButton.addEventListener('click', () => {
            audio.init();
            startGame();
        });

        restartButton.addEventListener('click', () => {
            audio.init();
            startGame();
        });

        bottleRefillButton.addEventListener('click', () => {
            if (gameState === 'PLAYING') {
                petWaterLevel = Math.min(100, petWaterLevel + 12);
            }
        });

        function startGame() {
            bgm.currentTime = 0;
            bgm.play().catch(error => {
                console.error('BGM playback failed:', error);
            });

            score = 0;
            combo = 0;
            maxCombo = 0;
            lives = 3;
            petWaterLevel = 100;
            bambooWater = 0;
            bambooAngle = 0;
            isStriking = false;
            animals = [];
            shockwaves = [];
            particles = [];
            floatTexts = [];
            spawnTimer = 0;

            document.getElementById('titleScreen').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.add('hidden');
            bottleRefillButton.classList.remove('hidden');
            gameState = 'PLAYING';
        }

        function triggerGameOver() {
            gameState = 'GAMEOVER';
            isPouringInput = false;
            bottleRefillButton.classList.add('hidden');
            bgm.pause();
            bgm.currentTime = 0;
            audio.stopPourSound();

            if (score > highScore) {
                highScore = score;
                localStorage.setItem('shishi_highscore', highScore.toString());
            }

            // Assign Rank Title
            let rank = 'ししおどし初心者';
            if (score >= 20000) rank = '👑 究極のししおどし達人';
            else if (score >= 12000) rank = '🔊 驚愕の音響師';
            else if (score >= 6000) rank = '狩人級のビビらせ王';
            else if (score >= 2500) rank = '庭園の見張り番';

            document.getElementById('finalScore').textContent = score.toLocaleString();
            document.getElementById('finalHighScore').textContent = highScore.toLocaleString();
            document.getElementById('finalMaxCombo').textContent = maxCombo;
            document.getElementById('rankTitle').textContent = rank;

            document.getElementById('gameOverScreen').classList.remove('hidden');
        }

        function updateGame() {
            if (gameState !== 'PLAYING') return;

            // 1. PET Bottle & Pouring Mechanics
            if (isPouringInput && petWaterLevel > 0) {
                petWaterLevel = Math.max(0, petWaterLevel - 0.45);
                bambooWater = Math.min(100, bambooWater + 0.65);
                petAngle = Math.min(0.6, petAngle + 0.08); // Tilt down
                audio.startPourSound();

                // Water Splash particles at spout
                if (Math.random() < 0.6) {
                    particles.push(new Particle(195, 230, '#a5f3fc', 3, 2.5));
                }
            } else {
                petAngle = Math.max(0, petAngle - 0.08); // Stand upright
                audio.stopPourSound();
                // Slowly regenerate PET bottle water when not pouring
                petWaterLevel = Math.min(100, petWaterLevel + 0.12);
            }

            // 2. Bamboo Hydraulics & Strike Logic
            if (!isStriking) {
                // Bamboo tilts backward as water fills (angle ranges 0 to -0.35 rad)
                bambooAngle = -(bambooWater / 100) * 0.35;

                if (bambooWater >= 100) {
                    // Trigger "カツン！" Strike
                    isStriking = true;
                    strikeProgress = 0;
                    audio.playStrikeSound();
                    
                    // Create Shockwave originating from Rock
                    shockwaves.push({
                        x: ROCK_POS.x,
                        y: ROCK_POS.y - 10,
                        radius: 10,
                        maxRadius: 520,
                        speed: 16,
                        opacity: 1.0,
                        hitAnimalIds: new Set()
                    });

                    // Impact splash particles
                    for (let i = 0; i < 20; i++) {
                        particles.push(new Particle(ROCK_POS.x, ROCK_POS.y - 15, '#e0f2fe', 6, 3));
                        particles.push(new Particle(ROCK_POS.x, ROCK_POS.y - 10, '#84cc16', 4, 2));
                    }

                    bambooWater = 0; // Empty bamboo water
                }
            } else {
                // Rapid Strike Animation Sequence
                strikeProgress += 0.15;
                if (strikeProgress < 0.5) {
                    // Forward strike snap
                    bambooAngle = 0.22;
                } else if (strikeProgress < 1.0) {
                    // Rebound bounce
                    bambooAngle = -0.08 * (1.0 - strikeProgress);
                } else {
                    isStriking = false;
                    bambooAngle = 0;
                }
            }

            // 3. Animal Spawning Engine
            spawnTimer++;
            if (spawnTimer >= nextSpawnInterval) {
                spawnTimer = 0;
                nextSpawnInterval = Math.max(60, 140 - Math.floor(score / 800) * 8);

                const rand = Math.random();
                let type = 'DEER';
                if (rand < 0.4) type = 'RABBIT';
                else if (rand < 0.65) type = 'LION';

                animals.push(new Animal(type));
            }

            // 4. Update Animals
            for (let i = animals.length - 1; i >= 0; i--) {
                const a = animals[i];
                a.update();

                // Check Danger Zone Breach (Life loss)
                if (a.state === 'APPROACH' && a.x <= DANGER_X) {
                    lives--;
                    audio.playDamageSound();
                    floatTexts.push(new FloatText(a.x, a.y - 20, '突破された！ -1❤', '#ef4444', true));
                    animals.splice(i, 1);

                    if (lives <= 0) {
                        triggerGameOver();
                        return;
                    }
                    continue;
                }

                // Cleanup offscreen animals
                if (a.x > 1100 || a.y > 600) {
                    animals.splice(i, 1);
                }
            }

            // 5. Update Shockwaves & Collision Checks
            for (let w = shockwaves.length - 1; w >= 0; w--) {
                const sw = shockwaves[w];
                sw.radius += sw.speed;
                sw.opacity -= 0.02;

                // Evaluate shockwave hit against each active approaching animal
                animals.forEach((a) => {
                    if (a.state === 'APPROACH' && !sw.hitAnimalIds.has(a)) {
                        const dist = Math.abs(a.x - sw.x);
                        if (dist <= sw.radius && dist >= sw.radius - sw.speed * 2) {
                            sw.hitAnimalIds.add(a);

                            // Evaluate Zone Rating
                            if (a.x >= JUST_ZONE_MIN && a.x <= JUST_ZONE_MAX) {
                                // CRITICAL JUST ZONE HIT!
                                combo++;
                                if (combo > maxCombo) maxCombo = combo;

                                const pts = a.basePoints * combo;
                                score += pts;

                                a.state = 'SCARED_FLIET';
                                a.vx = 8 + Math.random() * 4;
                                a.vy = -12 - Math.random() * 4;

                                audio.playCriticalSound();
                                floatTexts.push(new FloatText(a.x, a.y - 30, `CRITICAL!! +${pts}`, '#fde047', true));
                                if (combo > 1) {
                                    floatTexts.push(new FloatText(a.x, a.y - 60, `${combo} COMBO!`, '#38bdf8', false));
                                }
                            } else if (a.x > JUST_ZONE_MAX && a.x <= CAUTION_ZONE_MAX) {
                                // CAUTION / SCARE HIT
                                combo = 1; // Reset combo multiplier
                                const pts = 100;
                                score += pts;

                                a.state = 'SCARED_RUN';
                                audio.playScareSound();
                                floatTexts.push(new FloatText(a.x, a.y - 20, `びびり! +${pts}`, '#a3e635', false));
                            }
                        }
                    }
                });

                if (sw.opacity <= 0 || sw.radius >= sw.maxRadius) {
                    shockwaves.splice(w, 1);
                }
            }

            // 6. Update Particles & Float Texts
            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].update();
                if (particles[i].life <= 0) particles.splice(i, 1);
            }

            for (let i = floatTexts.length - 1; i >= 0; i--) {
                floatTexts[i].update();
                if (floatTexts[i].life <= 0) floatTexts.splice(i, 1);
            }

            // 7. Update Sakura Petals
            sakuraPetals.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                p.rotation += 0.02;
                if (p.x < -20) p.x = 980;
                if (p.y > 560) p.y = -20;
            });
        }

        function drawGardenBackground() {
            // Twilight Garden Gradient Sky
            const skyGrad = ctx.createLinearGradient(0, 0, 0, 350);
            skyGrad.addColorStop(0, '#111827');
            skyGrad.addColorStop(0.6, '#1e3a2b');
            skyGrad.addColorStop(1, '#2d5a3f');
            ctx.fillStyle = skyGrad;
            ctx.fillRect(0, 0, 960, 540);

            // Bamboo Forest Silhouettes Background
            ctx.fillStyle = '#173322';
            for (let i = 0; i < 960; i += 35) {
                ctx.fillRect(i, 100, 18, 280);
                ctx.fillRect(i + 12, 80, 8, 300);
            }

            // Bamboo Fence (竹垣)
            ctx.fillStyle = '#4a3525';
            ctx.fillRect(0, 320, 960, 12);
            ctx.fillRect(0, 360, 960, 12);
            for (let x = 40; x < 960; x += 60) {
                ctx.fillRect(x, 290, 8, 90);
            }

            // Ground Layer (Mossy Grass Hill)
            const groundGrad = ctx.createLinearGradient(0, 370, 0, 540);
            groundGrad.addColorStop(0, '#365314');
            groundGrad.addColorStop(0.3, '#1a380f');
            groundGrad.addColorStop(1, '#0f230a');
            ctx.fillStyle = groundGrad;
            ctx.beginPath();
            ctx.moveTo(0, 370);
            ctx.bezierCurveTo(300, 365, 600, 375, 960, 370);
            ctx.lineTo(960, 540);
            ctx.lineTo(0, 540);
            ctx.fill();

            // Garden Pathway & Moss Rocks
            ctx.fillStyle = '#3f3f46';
            ctx.beginPath();
            ctx.ellipse(ROCK_POS.x, ROCK_POS.y + 10, 35, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // Japanese Stone Lantern (石灯籠) on Left
            ctx.fillStyle = '#52525b';
            ctx.fillRect(70, 310, 24, 60); // Pillar
            ctx.fillRect(60, 290, 44, 20); // Light chamber
            ctx.fillStyle = '#fef08a'; // Light glow
            ctx.fillRect(68, 294, 28, 12);
            ctx.fillStyle = '#3f3f46'; // Roof
            ctx.beginPath();
            ctx.moveTo(50, 290); ctx.lineTo(114, 290); ctx.lineTo(82, 265);
            ctx.closePath();
            ctx.fill();

            // Zone Visual Guides on Ground (Caution & Just Zones)
            ctx.fillStyle = 'rgba(234, 179, 8, 0.08)'; // Caution Zone (Yellow)
            ctx.fillRect(JUST_ZONE_MAX, 370, CAUTION_ZONE_MAX - JUST_ZONE_MAX, 170);

            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // Just Zone (Red / Critical)
            ctx.fillRect(JUST_ZONE_MIN, 370, JUST_ZONE_MAX - JUST_ZONE_MIN, 170);

            // Zone Labels
            ctx.font = '700 13px "Zen Maru Gothic"';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(248, 113, 113, 0.8)';
            ctx.fillText('🎯 ジャストゾーン (CRITICAL)', (JUST_ZONE_MIN + JUST_ZONE_MAX) / 2, 520);

            ctx.fillStyle = 'rgba(253, 224, 71, 0.6)';
            ctx.fillText('⚡ 警戒エリア', (JUST_ZONE_MAX + CAUTION_ZONE_MAX) / 2, 520);

            // Danger line indicator
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(DANGER_X, 360); ctx.lineTo(DANGER_X, 540);
            ctx.stroke();
            ctx.setLineDash([]);

            // Floating Sakura Petals
            ctx.fillStyle = '#fbcfe8';
            sakuraPetals.forEach(p => {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.beginPath();
                ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }

        function drawShishiOdoshi() {
            // 1. Wooden Stand Support Posts
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(BAMBOO_PIVOT.x - 15, BAMBOO_PIVOT.y + 60);
            ctx.lineTo(BAMBOO_PIVOT.x, BAMBOO_PIVOT.y);
            ctx.lineTo(BAMBOO_PIVOT.x + 15, BAMBOO_PIVOT.y + 60);
            ctx.stroke();

            // 2. Bamboo Cylinder Tube (Rotates on Pivot)
            ctx.save();
            ctx.translate(BAMBOO_PIVOT.x, BAMBOO_PIVOT.y);
            ctx.rotate(bambooAngle);

            // Main Bamboo Tube
            const bambooGrad = ctx.createLinearGradient(-80, -12, 80, 12);
            bambooGrad.addColorStop(0, '#65a30d');
            bambooGrad.addColorStop(0.5, '#84cc16');
            bambooGrad.addColorStop(1, '#4d7c0f');
            ctx.fillStyle = bambooGrad;

            ctx.beginPath();
            ctx.roundRect(-80, -12, 150, 24, 4);
            ctx.fill();

            // Slanted Cut Mouth on Left Top Spout
            ctx.fillStyle = '#3f6212';
            ctx.beginPath();
            ctx.ellipse(-78, 0, 6, 11, 0, 0, Math.PI * 2);
            ctx.fill();

            // Bamboo Joints / Ridges
            ctx.strokeStyle = '#3f6212';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-20, -12); ctx.lineTo(-20, 12);
            ctx.moveTo(30, -12); ctx.lineTo(30, 12);
            ctx.stroke();

            // Water inside bamboo indicator
            if (bambooWater > 0) {
                ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
                ctx.fillRect(-70, -6, (bambooWater / 100) * 110, 12);
            }

            ctx.restore();

            // Pivot Center Black Rope Tie
            ctx.fillStyle = '#18181b';
            ctx.beginPath();
            ctx.arc(BAMBOO_PIVOT.x, BAMBOO_PIVOT.y, 8, 0, Math.PI * 2);
            ctx.fill();

            // 3. PET Bottle (給水ペットボトル)
            ctx.save();
            ctx.translate(PET_POS.x, PET_POS.y);
            ctx.rotate(petAngle);

            // Bottle Body (Plastic transparent style)
            ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(-25, -45, 50, 80, 8);
            ctx.fill(); ctx.stroke();

            // Cap
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(10, -8, 14, 16);

            // Water Level Inside Bottle
            const fillH = (petWaterLevel / 100) * 70;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
            ctx.fillRect(-22, 30 - fillH, 44, fillH);

            // Label
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-22, -15, 44, 20);
            ctx.fillStyle = '#0369a1';
            ctx.font = '900 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('天然水', 0, -1);

            ctx.restore();

            // Water Stream falling from PET bottle cap into bamboo when pouring
            if (isPouringInput && petWaterLevel > 0) {
                ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
                ctx.beginPath();
                ctx.moveTo(175, 175);
                ctx.lineTo(185, 175);
                ctx.lineTo(135 + Math.sin(Date.now() * 0.05) * 2, 330);
                ctx.lineTo(128, 330);
                ctx.closePath();
                ctx.fill();
            }

            // Bamboo Water Gauge Floating HUD
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.fillRect(BAMBOO_PIVOT.x - 40, BAMBOO_PIVOT.y - 65, 80, 22);
            ctx.strokeStyle = '#84cc16';
            ctx.strokeRect(BAMBOO_PIVOT.x - 40, BAMBOO_PIVOT.y - 65, 80, 22);

            ctx.fillStyle = '#84cc16';
            ctx.fillRect(BAMBOO_PIVOT.x - 38, BAMBOO_PIVOT.y - 63, (bambooWater / 100) * 76, 18);

            ctx.font = '900 12px "Zen Maru Gothic"';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.floor(bambooWater)}%`, BAMBOO_PIVOT.x, BAMBOO_PIVOT.y - 50);
        }

        function drawUI() {
            // Top HUD Bar
            ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.fillRect(0, 0, 960, 54);
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, 54); ctx.lineTo(960, 54);
            ctx.stroke();

            // Score & High Score
            ctx.font = '900 22px "Zen Maru Gothic"';
            ctx.textAlign = 'left';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(`SCORE: ${score.toLocaleString()}`, 20, 35);

            ctx.font = '700 14px "Zen Maru Gothic"';
            ctx.fillStyle = '#a1a1aa';
            ctx.fillText(`BEST: ${highScore.toLocaleString()}`, 210, 35);

            // Combo Badge
            if (combo > 1) {
                ctx.fillStyle = '#38bdf8';
                ctx.font = '900 20px "Zen Maru Gothic"';
                ctx.fillText(`🔥 ${combo} COMBO`, 360, 35);
            }

            // Lives (Hearts)
            ctx.textAlign = 'right';
            let heartsStr = '';
            for (let i = 0; i < 3; i++) {
                heartsStr += (i < lives) ? '❤️ ' : '🖤 ';
            }
            ctx.font = '20px sans-serif';
            ctx.fillText(heartsStr, 940, 35);

            // PET Bottle Water Remaining Meter (Bottom Left)
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.fillRect(20, 480, 160, 40);
            ctx.strokeStyle = '#0284c7';
            ctx.strokeRect(20, 480, 160, 40);

            ctx.fillStyle = petWaterLevel < 20 ? '#ef4444' : '#38bdf8';
            ctx.fillRect(24, 484, (petWaterLevel / 100) * 152, 32);

            ctx.font = '700 12px "Zen Maru Gothic"';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(petWaterLevel < 5 ? '空っぽ (回復中)' : 'ペットボトル残水', 100, 504);
        }

        function render() {
            ctx.clearRect(0, 0, 960, 540);

            // 1. Draw Environment
            drawGardenBackground();

            // 2. Draw Animals
            animals.forEach(a => a.draw(ctx));

            // 3. Draw Shockwaves
            shockwaves.forEach(sw => {
                ctx.save();
                ctx.strokeStyle = `rgba(56, 189, 248, ${sw.opacity})`;
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(sw.x, sw.y, sw.radius, -Math.PI * 0.4, Math.PI * 0.4);
                ctx.stroke();
                ctx.restore();
            });

            // 4. Draw Bamboo & PET Bottle
            drawShishiOdoshi();

            // 5. Draw Particle Effects & Float Text
            particles.forEach(p => p.draw(ctx));
            floatTexts.forEach(ft => ft.draw(ctx));

            // 6. Draw HUD UI
            if (gameState === 'PLAYING') {
                drawUI();
            }
        }

        function gameLoop() {
            updateGame();
            render();
            requestAnimationFrame(gameLoop);
        }

        // Start requestAnimationFrame loop
        requestAnimationFrame(gameLoop);
