jQuery(async () => {
    const CANVAS_ID = 'st-ambient-canvas';
    const MENU_ID = 'ambient-effects-menu';
    
    // --- 默认配置 ---
    let config = {
        enabled: false,
        type: 'snow',
        speed: 2,
        size: 3,
        count: 100,
        color: '#ffffff'
    };

    const saved = localStorage.getItem('st_ambient_config');
    if (saved) config = { ...config, ...JSON.parse(saved) };

    // --- 1. 粒子系统 ---
    let ctx, particles = [], w, h, animationFrame;

    class Particle {
        constructor() { this.reset(true); }
        reset(initial = false) {
            this.x = Math.random() * w;
            this.y = initial ? Math.random() * h : -20;
            this.size = Math.random() * config.size + (config.size / 2);
            this.speedY = (Math.random() * 0.5 + 0.5) * config.speed; 
            this.speedX = (Math.random() - 0.5) * (config.speed * 0.5); 
            this.angle = Math.random() * 360;
            this.spin = (Math.random() - 0.5) * 2; 
            this.opacity = Math.random() * 0.5 + 0.3;
        }
        update() {
            this.y += this.speedY;
            this.x += this.speedX + Math.sin(this.y * 0.01) * 0.5;
            this.angle += this.spin;
            if (this.y > h + 20 || this.x > w + 20 || this.x < -20) this.reset();
        }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle * Math.PI / 180);
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = config.color;
            switch (config.type) {
                case 'star': this.drawStar(ctx, this.size); break;
                case 'flower': this.drawflower(ctx, this.size); break;
                case 'leaf': this.drawLeaf(ctx, this.size); break;
                default:
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                    ctx.shadowBlur = 5; ctx.shadowColor = config.color; ctx.fill();
                    break;
            }
            ctx.restore();
        }
        drawStar(c, r) {
            c.beginPath(); c.moveTo(0, -r);
            c.quadraticCurveTo(2, -2, r, 0); c.quadraticCurveTo(2, 2, 0, r);
            c.quadraticCurveTo(-2, 2, -r, 0); c.quadraticCurveTo(-2, -2, 0, -r); c.fill();
        }
        drawLeaf(c, r) {
            c.beginPath(); c.ellipse(0, 0, r, r/2, 0, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.strokeStyle = "rgba(0,0,0,0.2)"; c.moveTo(-r, 0); c.lineTo(r, 0); c.stroke();
        }
        drawflower(c, r) {
            c.beginPath(); c.moveTo(0, 0);
            c.bezierCurveTo(r, -r, r*2, 0, 0, r); c.bezierCurveTo(-r*2, 0, -r, -r, 0, 0); c.fill();
        }
    }

    function initCanvas() {
        let canvas = document.getElementById(CANVAS_ID);
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = CANVAS_ID;
            document.body.appendChild(canvas); 
        }
        ctx = canvas.getContext('2d');
        const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
        window.addEventListener('resize', resize);
        resize();
        loop();
    }

    function loop() {
        ctx.clearRect(0, 0, w, h);
        if (config.enabled) {
            if (particles.length < config.count) while(particles.length < config.count) particles.push(new Particle());
            else if (particles.length > config.count) particles.splice(config.count);
            particles.forEach(p => { p.update(); p.draw(); });
        } else particles = [];
        animationFrame = requestAnimationFrame(loop);
    }

    // --- 2. 菜单注入 (UI) ---
    function injectSettingsMenu() {
        const container = $('#extensions_settings'); 
        if (container.length === 0 || $(`#${MENU_ID}`).length) return;
        const html = `
            <div id="${MENU_ID}" class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>✨ 氛围特效 (Ambient)</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down"></div>
                </div>
                <div class="inline-drawer-content ambient-settings-box">
                    <div class="ambient-desc">自定义你的背景氛围效果</div>
                    
                    <div class="ambient-control-row">
                        <label>启用特效</label>
                        <input type="checkbox" id="ambient_enabled" ${config.enabled ? 'checked' : ''}>
                    </div>
                    <div class="ambient-control-row">
                        <label>特效类型</label>
                        <select id="ambient_type">
                            <option value="snow">❄️ 柔光雪花</option>
                            <option value="star"
