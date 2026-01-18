jQuery(async () => {
    const CANVAS_ID = 'st-ambient-canvas';
    const MENU_ID = 'ambient-effects-menu';
    
    // --- 默认配置 ---
    let config = {
        enabled: false,
        type: 'snow',   // snow, star, sakura, leaf
        speed: 2,
        size: 3,
        count: 100,
        color: '#ffffff'
    };

    // 读取保存的配置
    const saved = localStorage.getItem('st_ambient_config');
    if (saved) {
        config = { ...config, ...JSON.parse(saved) };
    }

    // --- 1. 粒子系统 (不使用 Emoji，纯代码绘图) ---
    let ctx;
    let particles = [];
    let w, h;
    let animationFrame;

    // 粒子类
    class Particle {
        constructor() {
            this.reset(true);
        }

        reset(initial = false) {
            this.x = Math.random() * w;
            this.y = initial ? Math.random() * h : -20;
            this.size = Math.random() * config.size + (config.size / 2); // 大小浮动
            
            // 速度基于配置
            this.speedY = (Math.random() * 0.5 + 0.5) * config.speed; 
            this.speedX = (Math.random() - 0.5) * (config.speed * 0.5); 
            
            // 旋转 (用于叶子/花瓣)
            this.angle = Math.random() * 360;
            this.spin = (Math.random() - 0.5) * 2; 

            this.opacity = Math.random() * 0.5 + 0.3;
        }

        update() {
            this.y += this.speedY;
            this.x += this.speedX + Math.sin(this.y * 0.01) * 0.5; // 加入一点左右摇摆
            this.angle += this.spin;

            if (this.y > h + 20 || this.x > w + 20 || this.x < -20) {
                this.reset();
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle * Math.PI / 180);
            ctx.globalAlpha = this.opacity;
            ctx.fillStyle = config.color;

            // 根据类型画出不同的形状
            switch (config.type) {
                case 'star': // 画星星 (十字光)
                    this.drawStar(ctx, this.size);
                    break;
                case 'sakura': // 画樱花 (5瓣)
                    this.drawSakura(ctx, this.size);
                    break;
                case 'leaf': // 画叶子 (椭圆)
                    this.drawLeaf(ctx, this.size);
                    break;
                case 'snow': // 默认为圆点 (雪花/萤火虫)
                default:
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                    ctx.shadowBlur = 5; // 发光效果
                    ctx.shadowColor = config.color;
                    ctx.fill();
                    break;
            }
            ctx.restore();
        }

        drawStar(c, r) {
            c.beginPath();
            c.moveTo(0, -r);
            c.quadraticCurveTo(2, -2, r, 0);
            c.quadraticCurveTo(2, 2, 0, r);
            c.quadraticCurveTo(-2, 2, -r, 0);
            c.quadraticCurveTo(-2, -2, 0, -r);
            c.fill();
        }

        drawLeaf(c, r) {
            c.beginPath();
            c.ellipse(0, 0, r, r/2, 0, 0, Math.PI * 2);
            c.fill();
            c.beginPath(); // 叶脉
            c.strokeStyle = "rgba(0,0,0,0.2)";
            c.moveTo(-r, 0);
            c.lineTo(r, 0);
            c.stroke();
        }
        
        drawSakura(c, r) {
            // 简单的花瓣形状
            c.beginPath();
            c.moveTo(0, 0);
            c.bezierCurveTo(r, -r, r*2, 0, 0, r);
            c.bezierCurveTo(-r*2, 0, -r, -r, 0, 0);
            c.fill();
        }
    }

    function initCanvas() {
        // 创建画布
        let canvas = document.getElementById(CANVAS_ID);
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = CANVAS_ID;
            document.body.prepend(canvas); // 放在最底层背景之上
        }
        ctx = canvas.getContext('2d');
        
        // 尺寸处理
        const resize = () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // 启动循环
        loop();
    }

    function loop() {
        // 清空画布
        ctx.clearRect(0, 0, w, h);

        if (config.enabled) {
            // 确保粒子数量正确
            if (particles.length < config.count) {
                while(particles.length < config.count) particles.push(new Particle());
            } else if (particles.length > config.count) {
                particles.splice(config.count);
            }

            particles.forEach(p => {
                p.update();
                p.draw();
            });
        } else {
            particles = []; // 关闭时清空
        }

        animationFrame = requestAnimationFrame(loop);
    }

    // --- 2. 菜单注入 (UI) ---
    function injectSettingsMenu() {
        // 找到酒馆的扩展列表容器 (你的截图显示的是 Extensions 下拉列表)
        // 通常 ID 是 extensions_settings 或者我们自己插入一个 Drawer
        const container = $('#extensions_settings'); 
        
        if (container.length === 0) return;
        if ($(`#${MENU_ID}`).length) return;

        // 构造 HTML：模仿酒馆原生的折叠菜单结构
        const html = `
            <div id="${MENU_ID}" class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>✨ 氛围特效 (Ambient)</b>
                    <div class="inline-drawer-icon fa-solid fa-angle-down"></div>
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
                            <option value="star">✨ 闪烁星光</option>
                            <option value="leaf">🍃 飘落树叶</option>
                            <option value="sakura">🌸 唯美樱花</option>
                        </select>
                    </div>

                    <div class="ambient-control-row">
                        <label>颜色 (Color)</label>
                        <input type="color" id="ambient_color" value="${config.color}">
                    </div>

                    <div class="ambient-control-row">
                        <label>粒子大小</label>
                        <input type="range" id="ambient_size" min="1" max="10" step="0.5" value="${config.size}">
                    </div>

                    <div class="ambient-control-row">
                        <label>飘落速度</label>
                        <input type="range" id="ambient_speed" min="0.5" max="10" step="0.5" value="${config.speed}">
                    </div>

                    <div class="ambient-control-row">
                        <label>粒子密度</label>
                        <input type="range" id="ambient_count" min="10" max="300" step="10" value="${config.count}">
                    </div>
                </div>
            </div>
        `;

        container.append(html);

        // 绑定事件
        // 1. 折叠开关
        $(`#${MENU_ID} .inline-drawer-toggle`).on('click', function() {
            $(this).parent().toggleClass('expanded');
            $(this).find('.inline-drawer-icon').toggleClass('fa-angle-down fa-angle-up');
        });

        // 2. 各种输入框变化
        $('#ambient_enabled').on('change', function() {
            config.enabled = $(this).is(':checked');
            saveConfig();
        });
        $('#ambient_type').val(config.type).on('change', function() {
            config.type = $(this).val();
            // 切换类型时自动推荐颜色
            if(config.type === 'leaf') config.color = '#88cc88';
            else if(config.type === 'sakura') config.color = '#ffb7b2';
            else if(config.type === 'snow') config.color = '#ffffff';
            else if(config.type === 'star') config.color = '#fff6cc';
            $('#ambient_color').val(config.color);
            saveConfig();
            resetParticles(); // 重置形状
        });
        $('#ambient_color').on('input', function() { config.color = $(this).val(); saveConfig(); });
        $('#ambient_size').on('input', function() { config.size = parseFloat($(this).val()); saveConfig(); resetParticles(); });
        $('#ambient_speed').on('input', function() { config.speed = parseFloat($(this).val()); saveConfig(); resetParticles(); });
        $('#ambient_count').on('input', function() { config.count = parseInt($(this).val()); saveConfig(); });

        console.log("Ambient Menu Injected!");
    }

    function saveConfig() {
        localStorage.setItem('st_ambient_config', JSON.stringify(config));
    }

    function resetParticles() {
        // 清空现有粒子，让它们重新以新形态生成
        particles = [];
    }

    // --- 启动流程 ---
    initCanvas();
    
    // 延迟注入菜单，等待酒馆UI加载完毕
    // 监听酒馆的扩展加载完毕信号（如果不支持则用定时器兜底）
    setTimeout(injectSettingsMenu, 2000);
    // 为了防止切换页面导致菜单消失，定期检查
    setInterval(injectSettingsMenu, 3000);
});
