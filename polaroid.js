// Polaroid Camera Three.js Animation - Fixed Version
console.log('POLAROID.JS LOADED');

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== POLAROID INIT START ===');

    // Check if Three.js is loaded
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded!');
        return;
    }

    const container = document.getElementById('polaroid-canvas-container');
    const missionSection = document.querySelector('.mission');
    const missionContent = document.querySelector('.mission-content');

    if (!container || !missionSection || !missionContent) {
        console.error('Required elements not found');
        return;
    }

    console.log('Elements found, initializing Three.js...');

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null;

    // Detect mobile
    const isMobile = window.innerWidth <= 768;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Position camera further back on mobile for better view
    camera.position.set(0, 0.5, isMobile ? 12 : 10);

    const renderer = new THREE.WebGLRenderer({
        antialias: true, // Enable antialiasing on all devices for sharper textures
        alpha: true,
        powerPreference: isMobile ? 'low-power' : 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Use device pixel ratio for sharp textures on all devices
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // Reduce quality on mobile for better performance
    renderer.shadowMap.enabled = !isMobile; // Disable shadows on mobile
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    console.log('Renderer created');

    // Create plastic bump map
    function createPlasticBumpMap() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(256, 256);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = 128 + (Math.random() - 0.5) * 40;
            imageData.data[i] = noise;
            imageData.data[i + 1] = noise;
            imageData.data[i + 2] = noise;
            imageData.data[i + 3] = 255;
        }
        ctx.putImageData(imageData, 0, 0);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    const plasticBump = createPlasticBumpMap();

    // Simple environment map
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 256;
    envCanvas.height = 256;
    const envCtx = envCanvas.getContext('2d');
    const envGradient = envCtx.createRadialGradient(128, 128, 0, 128, 128, 180);
    envGradient.addColorStop(0, '#4a4a5a');
    envGradient.addColorStop(0.5, '#2a2a3a');
    envGradient.addColorStop(1, '#0a0a15');
    envCtx.fillStyle = envGradient;
    envCtx.fillRect(0, 0, 256, 256);
    envCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    envCtx.beginPath();
    envCtx.arc(80, 60, 40, 0, Math.PI * 2);
    envCtx.fill();
    const envTexture = new THREE.CanvasTexture(envCanvas);
    envTexture.mapping = THREE.EquirectangularReflectionMapping;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404050, 0.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.0);
    keyLight.position.set(4, 6, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.4);
    fillLight.position.set(-5, 2, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x4a7fff, 0.5);
    rimLight.position.set(0, 3, -6);
    scene.add(rimLight);

    const bottomLight = new THREE.DirectionalLight(0x2a2a3a, 0.3);
    bottomLight.position.set(0, -5, 2);
    scene.add(bottomLight);

    // Materials
    const darkBodyMat = new THREE.MeshStandardMaterial({
        color: 0x1a1a1c,
        roughness: 0.75,
        metalness: 0.02,
        bumpMap: plasticBump,
        bumpScale: 0.003,
        envMap: envTexture,
        envMapIntensity: 0.15
    });

    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x28282a,
        roughness: 0.65,
        metalness: 0.02,
        bumpMap: plasticBump,
        bumpScale: 0.002,
        envMap: envTexture,
        envMapIntensity: 0.1
    });

    const blackMat = new THREE.MeshStandardMaterial({
        color: 0x0c0c0e,
        roughness: 0.5,
        metalness: 0.05,
        bumpMap: plasticBump,
        bumpScale: 0.001,
        envMap: envTexture,
        envMapIntensity: 0.2
    });

    const glossyBlackMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0c,
        roughness: 0.15,
        metalness: 0.1,
        envMap: envTexture,
        envMapIntensity: 0.5
    });

    const flashDiffuserMat = new THREE.MeshStandardMaterial({
        color: 0xc9a063,
        roughness: 0.35,
        metalness: 0.15,
        emissive: 0x3d2817,
        emissiveIntensity: 0.05
    });

    // Polaroid Group
    const polaroidGroup = new THREE.Group();

    // Build the camera (using the same geometry from working version)
    // BOTTOM SECTION
    const bottomSection = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.4), bodyMat);
    bottomSection.position.set(0, -1.2, 0);
    bottomSection.castShadow = true;
    bottomSection.receiveShadow = true;
    polaroidGroup.add(bottomSection);

    const filmDoor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.08), darkBodyMat);
    filmDoor.position.set(0, -1.0, 0.71);
    polaroidGroup.add(filmDoor);

    const slotOuter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), glossyBlackMat);
    slotOuter.position.set(0, -0.72, 0.7);
    polaroidGroup.add(slotOuter);

    const slotInner = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.08, 0.4), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    slotInner.position.set(0, -0.72, 0.5);
    polaroidGroup.add(slotInner);

    // MAIN BODY
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 1.5), darkBodyMat);
    mainBody.position.set(0, 0.2, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    polaroidGroup.add(mainBody);

    const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 0.1), glossyBlackMat);
    frontPanel.position.set(0, 0.35, 0.75);
    polaroidGroup.add(frontPanel);

    // LENS ASSEMBLY
    const lensHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 0.35, 32), blackMat);
    lensHousing.rotation.x = Math.PI / 2;
    lensHousing.position.set(-0.3, 0.25, 0.9);
    polaroidGroup.add(lensHousing);

    // Lens texture
    const lensCanvas = document.createElement('canvas');
    lensCanvas.width = 256;
    lensCanvas.height = 256;
    const lensCtx = lensCanvas.getContext('2d');
    const lensGradient = lensCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    lensGradient.addColorStop(0, '#0a0a12');
    lensGradient.addColorStop(0.3, '#08080f');
    lensGradient.addColorStop(0.7, '#0c0c18');
    lensGradient.addColorStop(1, '#141420');
    lensCtx.fillStyle = lensGradient;
    lensCtx.fillRect(0, 0, 256, 256);
    lensCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    lensCtx.beginPath();
    lensCtx.ellipse(90, 80, 35, 25, -0.5, 0, Math.PI * 2);
    lensCtx.fill();
    lensCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    lensCtx.beginPath();
    lensCtx.ellipse(170, 160, 20, 15, 0.5, 0, Math.PI * 2);
    lensCtx.fill();
    lensCtx.fillStyle = '#000000';
    lensCtx.beginPath();
    lensCtx.arc(128, 128, 35, 0, Math.PI * 2);
    lensCtx.fill();
    const lensTexture = new THREE.CanvasTexture(lensCanvas);

    const lensFace = new THREE.Mesh(new THREE.CircleGeometry(0.38, 32), new THREE.MeshBasicMaterial({ map: lensTexture }));
    lensFace.position.set(-0.3, 0.25, 1.08);
    polaroidGroup.add(lensFace);

    const lensRim = new THREE.Mesh(
        new THREE.RingGeometry(0.36, 0.42, 32),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.5, envMap: envTexture, envMapIntensity: 0.3 })
    );
    lensRim.position.set(-0.3, 0.25, 1.075);
    polaroidGroup.add(lensRim);

    // VIEWFINDER
    const viewfinderBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.3), blackMat);
    viewfinderBody.position.set(0.75, 0.35, 0.85);
    polaroidGroup.add(viewfinderBody);

    const vfCanvas = document.createElement('canvas');
    vfCanvas.width = 128;
    vfCanvas.height = 128;
    const vfCtx = vfCanvas.getContext('2d');
    const vfGradient = vfCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    vfGradient.addColorStop(0, '#2a3545');
    vfGradient.addColorStop(0.5, '#1a2535');
    vfGradient.addColorStop(1, '#0a1520');
    vfCtx.fillStyle = vfGradient;
    vfCtx.fillRect(0, 0, 128, 128);
    vfCtx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    vfCtx.beginPath();
    vfCtx.ellipse(45, 40, 20, 15, -0.3, 0, Math.PI * 2);
    vfCtx.fill();
    vfCtx.fillStyle = '#000';
    vfCtx.fillRect(54, 54, 20, 20);
    const vfTexture = new THREE.CanvasTexture(vfCanvas);

    const vfGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: vfTexture }));
    vfGlass.position.set(0.75, 0.35, 1.01);
    polaroidGroup.add(vfGlass);

    // DISTANCE SELECTOR
    const selectorBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.08), darkBodyMat);
    selectorBar.position.set(-0.1, -0.15, 0.82);
    polaroidGroup.add(selectorBar);

    const arrowLeft = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.03), bodyMat);
    arrowLeft.position.set(-0.35, -0.15, 0.87);
    polaroidGroup.add(arrowLeft);

    const arrowRight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.03), bodyMat);
    arrowRight.position.set(0.15, -0.15, 0.87);
    polaroidGroup.add(arrowRight);

    // FLASH UNIT
    const flashHousing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 0.6), darkBodyMat);
    flashHousing.position.set(0, 1.85, 0.1);
    flashHousing.castShadow = true;
    polaroidGroup.add(flashHousing);

    const flashFront = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.3, 0.08), glossyBlackMat);
    flashFront.position.set(0, 1.85, 0.35);
    polaroidGroup.add(flashFront);

    const flashDiffuser = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.1), flashDiffuserMat);
    flashDiffuser.position.set(0.7, 1.85, 0.4);
    polaroidGroup.add(flashDiffuser);

    // Flash grid
    for (let i = 0; i < 8; i++) {
        const gridLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.012, 0.015),
            new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.4, metalness: 0.2 })
        );
        gridLine.position.set(0.7, 1.45 + (i * 0.115), 0.46);
        polaroidGroup.add(gridLine);
    }

    for (let i = 0; i < 6; i++) {
        const gridLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.012, 0.95, 0.015),
            new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.4, metalness: 0.2 })
        );
        gridLine.position.set(0.35 + (i * 0.14), 1.85, 0.46);
        polaroidGroup.add(gridLine);
    }

    const flashNeck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), darkBodyMat);
    flashNeck.position.set(0, 1.0, 0.15);
    polaroidGroup.add(flashNeck);

    const leftSupport = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.3), bodyMat);
    leftSupport.position.set(-0.9, 1.0, 0.4);
    polaroidGroup.add(leftSupport);

    const rightSupport = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.3), bodyMat);
    rightSupport.position.set(0.9, 1.0, 0.4);
    polaroidGroup.add(rightSupport);

    const sideLever = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.25), bodyMat);
    sideLever.position.set(-1.55, -0.2, 0.3);
    polaroidGroup.add(sideLever);

    for (let i = 0; i < 5; i++) {
        const gripLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.08, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 })
        );
        gripLine.position.set(1.0, 0.1 + (i * 0.12), 0.55);
        polaroidGroup.add(gripLine);
    }

    scene.add(polaroidGroup);

    // POLAROID PHOTO
    const photoGroup = new THREE.Group();
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);

    // Photo frame
    const photoFrameCanvas = document.createElement('canvas');
    photoFrameCanvas.width = 256;
    photoFrameCanvas.height = 256;
    const pfCtx = photoFrameCanvas.getContext('2d');
    pfCtx.fillStyle = '#f5f5f0';
    pfCtx.fillRect(0, 0, 256, 256);
    const pfImageData = pfCtx.getImageData(0, 0, 256, 256);
    for (let i = 0; i < pfImageData.data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 8;
        pfImageData.data[i] = Math.min(255, Math.max(0, pfImageData.data[i] + noise));
        pfImageData.data[i + 1] = Math.min(255, Math.max(0, pfImageData.data[i + 1] + noise));
        pfImageData.data[i + 2] = Math.min(255, Math.max(0, pfImageData.data[i + 2] + noise - 3));
    }
    pfCtx.putImageData(pfImageData, 0, 0);
    const photoFrameTexture = new THREE.CanvasTexture(photoFrameCanvas);

    const photoFrameMat = new THREE.MeshStandardMaterial({
        map: photoFrameTexture,
        roughness: 0.85,
        metalness: 0.0,
        side: THREE.DoubleSide,
        clippingPlanes: [clipPlane],
        clipShadows: true
    });

    const photoFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.7, 0.03), photoFrameMat);
    photoFrame.castShadow = true;
    photoFrame.receiveShadow = true;
    photoGroup.add(photoFrame);

    // Load metrics.png using Image element (better file:// protocol support)
    const img = new Image();

    const photoTexture = new THREE.Texture();
    photoTexture.image = img;

    // Texture settings for high quality on all devices
    photoTexture.minFilter = THREE.LinearMipmapLinearFilter;
    photoTexture.magFilter = THREE.LinearFilter;
    photoTexture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Max anisotropic filtering
    photoTexture.generateMipmaps = true;
    photoTexture.encoding = THREE.sRGBEncoding; // Proper color encoding
    photoTexture.wrapS = THREE.ClampToEdgeWrapping;
    photoTexture.wrapT = THREE.ClampToEdgeWrapping;

    img.onload = function() {
        console.log('✅ metrics.png loaded successfully');
        photoTexture.needsUpdate = true;
    };

    img.onerror = function(err) {
        console.error('❌ Failed to load metrics.png:', err);
        console.log('Creating fallback texture...');
        // Create a fallback texture if image fails to load
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Create a gradient background as fallback
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);

        // Add text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('METRICS', 256, 256);

        photoTexture.image = canvas;
        photoTexture.needsUpdate = true;
    };

    // Set the image source last to trigger loading
    img.src = 'metrics.png';

    const photoImageMat = new THREE.MeshStandardMaterial({
        map: photoTexture,
        roughness: 0.7,
        metalness: 0.0,
        clippingPlanes: [clipPlane],
        clipShadows: true
    });

    const photoImage = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), photoImageMat);
    photoImage.position.set(0, 0.28, 0.02);
    photoGroup.add(photoImage);

    photoGroup.position.set(0, 0.7, 0.72);
    polaroidGroup.add(photoGroup);

    // Scale down camera on mobile for better fit
    if (isMobile) {
        polaroidGroup.scale.set(0.7, 0.7, 0.7);
    }

    let photoDetached = false;
    let scrollProgress = 0;
    let sectionProgress = 0;
    let isInSection = false;
    let hasFlashed = false;
    let detachmentWorldPos = null; // Store actual world position at detachment
    let detachmentWorldScale = null; // Store actual world scale at detachment

    const flashElement = document.getElementById('camera-flash');

    polaroidGroup.rotation.x = 0.1;
    polaroidGroup.rotation.y = -0.2;

    // Get section offset from top of page
    const sectionOffsetTop = missionSection.offsetTop;
    const sectionHeight = missionSection.offsetHeight;

    // Scroll calculation - with fade-in delay
    let scrollUpdateCount = 0;
    let cameraActivatedScroll = null;
    let animationStartScroll = null;
    const FADE_DELAY_VH = 30; // Wait 30vh after camera fades in before animation starts

    function updateScroll() {
        const scrollY = window.scrollY;
        const windowHeight = window.innerHeight;

        // Check if headline has reached sticky position (top: 60px - below navbar)
        const contentRect = missionContent.getBoundingClientRect();
        const isHeadlineSticky = contentRect.top <= 61;

        // Camera appears when headline sticks and we're in mission section
        const rect = missionSection.getBoundingClientRect();
        // We're in mission section if: headline is sticky AND section is still on screen
        const isInMissionSection = isHeadlineSticky && rect.bottom > 0 && rect.top < windowHeight;

        // Calculate animation progress
        let tempScrollProgress = 0;
        let isBeforeAnimationStart = false;

        // Record scroll position when first entering mission section
        if (isInMissionSection && cameraActivatedScroll === null) {
            cameraActivatedScroll = scrollY;
            animationStartScroll = scrollY + (FADE_DELAY_VH * windowHeight / 100);
            console.log('📷 CAMERA ACTIVATED at scrollY:', scrollY);
        }

        // Calculate progress if we have an activation point
        if (cameraActivatedScroll !== null && animationStartScroll !== null) {
            const scrollSinceFadeIn = scrollY - cameraActivatedScroll;
            const fadeDelayPixels = (FADE_DELAY_VH * windowHeight / 100);

            if (scrollSinceFadeIn >= fadeDelayPixels) {
                // Animation has started or is active
                const sectionEnd = sectionOffsetTop + sectionHeight;
                const animationRange = sectionEnd - animationStartScroll;
                const animationScroll = scrollY - animationStartScroll;
                tempScrollProgress = Math.max(0, Math.min(1, animationScroll / animationRange));

                if (tempScrollProgress > 0 && scrollProgress === 0) {
                    console.log('🎬 ANIMATION STARTING at scrollY:', scrollY);
                }
            } else if (scrollSinceFadeIn >= 0) {
                // In fade-in delay period
                isBeforeAnimationStart = true;
                tempScrollProgress = 0;
            } else {
                // Scrolled back before activation point
                tempScrollProgress = 0;
                isBeforeAnimationStart = true;
            }
        }

        scrollProgress = tempScrollProgress;

        // Reset activation values ONLY when headline becomes unsticky (scrolled all the way back up)
        if (!isHeadlineSticky && cameraActivatedScroll !== null) {
            console.log('📷 CAMERA RESET - headline unsticky');
            cameraActivatedScroll = null;
            animationStartScroll = null;
        }

        // Show camera when: in mission section AND (before animation start OR progress < 90%)
        const shouldShowCamera = isInMissionSection && (isBeforeAnimationStart || scrollProgress < 0.90);

        if (shouldShowCamera) {
            container.classList.add('active');
        } else {
            container.classList.remove('active');
        }

        // Log every 30th scroll event
        if (scrollUpdateCount++ % 30 === 0) {
            console.log('SCROLL: scrollY=', scrollY.toFixed(0),
                       'progress=', (scrollProgress * 100).toFixed(1) + '%',
                       'isInSection=', isInMissionSection,
                       'isBeforeAnim=', isBeforeAnimationStart,
                       'shouldShow=', shouldShowCamera);
        }
    }

    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    console.log('Initial values - sectionOffsetTop:', sectionOffsetTop, 'sectionHeight:', sectionHeight);

    // Easing functions
    function easeInOutQuart(t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }

    function smoothstep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    // Clipping plane helpers
    const localPlaneNormal = new THREE.Vector3(0, -1, 0);
    const worldPlaneNormal = new THREE.Vector3();
    const slotWorldPos = new THREE.Vector3();
    const slotLocalPos = new THREE.Vector3(0, -0.72, 0.72);

    function updateClipPlane() {
        slotWorldPos.copy(slotLocalPos);
        polaroidGroup.localToWorld(slotWorldPos);
        worldPlaneNormal.copy(localPlaneNormal);
        worldPlaneNormal.applyQuaternion(polaroidGroup.quaternion);
        worldPlaneNormal.normalize();
        clipPlane.normal.copy(worldPlaneNormal);
        clipPlane.constant = -worldPlaneNormal.dot(slotWorldPos);
    }

    const DETACH_POINT = isMobile ? 0.25 : 0.20; // Slightly later on mobile for smoother transition
    const CENTER_POINT = 0.55; // Photo is centered at this point

    function getPhotoLocalY(t) {
        if (t >= DETACH_POINT) return 0.7 - 4.2; // Fully ejected
        const normalizedT = t / DETACH_POINT;
        // Use smoother easing on mobile
        const eased = isMobile ? smoothstep(0, 1, normalizedT) : smoothstep(0, 1, normalizedT);
        return 0.7 - (eased * 4.2);
    }

    function getPhotoWorldPosition(t) {
        // Use actual detachment position if available
        const startY = detachmentWorldPos ? detachmentWorldPos.y : -3.3;
        const startZ = detachmentWorldPos ? detachmentWorldPos.z : 1.1;

        // Add a small hold period right after detachment on mobile to ensure smooth transition
        const TRANSITION_BLEND = isMobile ? 0.02 : 0.01;
        const blendStart = DETACH_POINT;
        const blendEnd = DETACH_POINT + TRANSITION_BLEND;

        if (t < blendEnd) {
            // Hold position briefly during blend
            return { y: startY, z: startZ };
        }

        // Photo moves from detach point to center, then stays centered
        if (t <= CENTER_POINT) {
            const normalizedT = (t - blendEnd) / (CENTER_POINT - blendEnd);
            const eased = smoothstep(0, 1, normalizedT);

            const endY = 0.4;
            const endZ = 5.0;

            const arcHeight = Math.sin(eased * Math.PI) * -0.3;
            const arcY = startY + (endY - startY) * eased + arcHeight;
            const z = startZ + (endZ - startZ) * eased;
            return { y: arcY, z: z };
        } else {
            // Stay centered from CENTER_POINT onwards
            return { y: 0.4, z: 5.0 };
        }
    }

    function getCameraPosition(t) {
        const moveAsideStart = 0.30;
        const moveAsideEnd = 0.60;
        const moveAsideFactor = smoothstep(moveAsideStart, moveAsideEnd, t);
        const zoomFactor = smoothstep(0, CENTER_POINT, t);
        return {
            x: moveAsideFactor * -3.0,
            y: moveAsideFactor * -0.5,
            z: zoomFactor * -3.5
        };
    }

    function getCameraRotation(t) {
        const rotateStart = 0.25;
        const rotateEnd = 0.60;
        const rotateFactor = smoothstep(rotateStart, rotateEnd, t);
        const initialRotateFactor = smoothstep(0, CENTER_POINT, t);
        return {
            x: 0.1 + rotateFactor * 0.05,
            y: -0.2 + initialRotateFactor * 0.2 + rotateFactor * 0.5,
            z: 0
        };
    }

    // Animation loop
    let logCounter = 0;
    function animate() {
        requestAnimationFrame(animate);

        const time = Date.now() * 0.001;
        const t = scrollProgress; // Use scrollProgress from updateScroll(), NOT calculated here

        // Trigger camera flash before photo starts ejecting (only when scrolling forward)
        if (t > 0.02 && t < 0.10 && !hasFlashed) {
            console.log('FLASH!');
            hasFlashed = true;
            flashElement.classList.add('flash');
            setTimeout(() => {
                flashElement.classList.remove('flash');
            }, 300);
        }

        // Reset flash flag when scrolling back below trigger point
        if (t <= 0.02) {
            hasFlashed = false;
        }

        // Log every 60 frames (about once per second)
        if (logCounter++ % 60 === 0) {
            console.log('ANIM FRAME: scrollY=', scrollY.toFixed(0), 't=', t.toFixed(3), 'photoDetached:', photoDetached);
            if (!photoDetached && t > 0) {
                const localY = getPhotoLocalY(t);
                console.log('Photo localY:', localY.toFixed(2));
            }
        }

        // Handle detachment when scrolling forward
        if (t >= DETACH_POINT && !photoDetached) {
            console.log('DETACHING PHOTO at t =', t);

            // Force a final update before detachment to ensure accurate position
            polaroidGroup.updateMatrixWorld(true);
            photoGroup.updateMatrixWorld(true);

            // Get exact world position, rotation, and scale at detachment moment
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();
            const worldScale = new THREE.Vector3();
            photoGroup.getWorldPosition(worldPos);
            photoGroup.getWorldQuaternion(worldQuat);
            photoGroup.getWorldScale(worldScale);

            // Store detachment position and scale for smooth transition
            detachmentWorldPos = { y: worldPos.y, z: worldPos.z };
            detachmentWorldScale = worldScale.x; // Uniform scale, so just use x
            console.log('Stored detachment position:', detachmentWorldPos, 'scale:', detachmentWorldScale);

            // Remove from parent and add to scene
            polaroidGroup.remove(photoGroup);
            scene.add(photoGroup);

            // Set exact position, rotation, and scale to prevent jump
            photoGroup.position.copy(worldPos);
            photoGroup.quaternion.copy(worldQuat);
            photoGroup.scale.set(worldScale.x, worldScale.y, worldScale.z);

            // Disable clipping gradually to avoid pop
            setTimeout(() => {
                photoFrameMat.clippingPlanes = [];
                photoImageMat.clippingPlanes = [];
            }, isMobile ? 50 : 0); // Small delay on mobile

            photoDetached = true;
        }

        // Re-attach if scrolling back below detach point
        if (t < DETACH_POINT && photoDetached) {
            console.log('RE-ATTACHING PHOTO at t =', t);
            // Get current world position before re-attaching
            const currentWorldPos = photoGroup.position.clone();
            const currentWorldQuat = photoGroup.quaternion.clone();

            // Re-attach to camera
            scene.remove(photoGroup);
            polaroidGroup.add(photoGroup);

            // Calculate local position to maintain visual continuity
            const localY = getPhotoLocalY(t);
            photoGroup.position.set(0, localY, 0.72);
            photoGroup.rotation.set(0, 0, 0);
            photoGroup.scale.set(1, 1, 1); // Reset scale when re-attached

            // Re-enable clipping
            photoFrameMat.clippingPlanes = [clipPlane];
            photoImageMat.clippingPlanes = [clipPlane];
            photoDetached = false;
            detachmentWorldPos = null; // Reset for next detachment
            detachmentWorldScale = null; // Reset scale for next detachment
        }

        // Update photo position
        if (!photoDetached) {
            const localY = getPhotoLocalY(t);
            photoGroup.position.set(0, localY, 0.72);
            photoGroup.rotation.set(0, 0, 0);
            updateClipPlane();
        } else {
            const worldPos = getPhotoWorldPosition(t);
            const rotationFade = smoothstep(DETACH_POINT, CENTER_POINT, t);
            photoGroup.position.set(0, worldPos.y, worldPos.z);
            photoGroup.rotation.x = (1 - rotationFade) * 0.1;
            photoGroup.rotation.y = (1 - rotationFade) * -0.2;
            photoGroup.rotation.z = 0;

            // Smoothly scale from detachment scale to 1.0
            if (detachmentWorldScale !== null) {
                const currentScale = detachmentWorldScale + (1.0 - detachmentWorldScale) * rotationFade;
                photoGroup.scale.set(currentScale, currentScale, currentScale);
            }
        }

        // Update camera
        const camPos = getCameraPosition(t);
        const camRot = getCameraRotation(t);
        polaroidGroup.position.set(camPos.x, camPos.y, camPos.z);
        polaroidGroup.rotation.set(camRot.x, camRot.y, camRot.z);

        // Floating
        const floatAmount = photoDetached ? 0.008 : 0.015;
        polaroidGroup.position.y += Math.sin(time * 0.8) * floatAmount;
        polaroidGroup.rotation.z += Math.sin(time * 0.5) * 0.005;

        if (photoDetached && t > 0.7) {
            photoGroup.position.y += Math.sin(time * 1.0) * 0.005;
        }

        renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    function handleResize() {
        const newIsMobile = window.innerWidth <= 768;

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Update camera position and scale based on screen size
        camera.position.z = newIsMobile ? 12 : 10;
        polaroidGroup.scale.set(newIsMobile ? 0.7 : 1, newIsMobile ? 0.7 : 1, newIsMobile ? 0.7 : 1);
    }

    window.addEventListener('resize', handleResize);

    console.log('=== POLAROID INIT COMPLETE ===');
});
