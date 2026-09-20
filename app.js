/**
 * RAZ | HAUTE PARFUMERIE — CINEMATIC SCROLL-DRIVEN HERO
 * High-performance canvas sequence renderer with smooth lerp physics,
 * intentional left-aligned hero product composition, and post-landing
 * brand name reveal.
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 240;
  const FRAME_PREFIX = 'ezgif-frame-';
  const FRAME_EXT = '.png';
  const LERP_FACTOR = 0.14; // Snappy yet cinematic inertia
  const LANDING_COMPLETE_FRAME = 195; // Frame where falcon landing is fully established
  const FULL_REVEAL_FRAME = 232;

  // --- Primary and Fallback Frame Directories ---
  const DIRECTORIES = ['3D VIDEO HEROSECTION', 'frames', 'public/frames'];

  // --- DOM Elements ---
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const brandContainer = document.getElementById('brandContainer');
  const loadingLine = document.getElementById('loadingLine');

  // --- State Variables ---
  const images = new Array(TOTAL_FRAMES);
  let loadedCount = 0;
  let targetFrame = 0;
  let currentFrame = 0;
  let animationFrameId = null;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let isFrameLocked = false;
  let isCinematicPlaying = false;
  let cinematicAnimationId = null;

  // Zero-pad frame number to 3 digits (e.g. 001, 042, 240)
  function pad(num, size = 3) {
    return String(num).padStart(size, '0');
  }

  // Generate frame URL
  function getFrameUrl(dirIndex, frameIndex) {
    const dir = DIRECTORIES[dirIndex];
    return `${dir}/${FRAME_PREFIX}${pad(frameIndex + 1, 3)}${FRAME_EXT}`;
  }

  // --- Image Loading with Fallback Paths ---
  function loadImage(frameIndex, dirIndex = 0) {
    if (images[frameIndex] && images[frameIndex].complete) return;

    const img = new Image();
    img.src = encodeURI(getFrameUrl(dirIndex, frameIndex));

    img.onload = () => {
      images[frameIndex] = img;
      onFrameLoaded(frameIndex);
    };

    img.onerror = () => {
      if (dirIndex + 1 < DIRECTORIES.length) {
        loadImage(frameIndex, dirIndex + 1);
      } else {
        loadedCount++;
      }
    };
  }

  function onFrameLoaded(index) {
    loadedCount++;

    // Update silent hairline progress indicator
    if (loadingLine) {
      const progressPercent = Math.min((loadedCount / TOTAL_FRAMES) * 100, 100);
      loadingLine.style.width = `${progressPercent}%`;

      if (loadedCount >= Math.min(30, TOTAL_FRAMES)) {
        loadingLine.classList.add('completed');
      }
    }

    // Always re-render so the screen displays the latest loaded frame
    renderCurrentFrame();
  }

  // Preload Strategy: Anchor frames (first & last), keyframes, then streaming
  function preloadAllFrames() {
    // Phase 1: Frame 0 (initial scene) and Frame 239 (final landed state)
    loadImage(0);
    loadImage(TOTAL_FRAMES - 1);

    // Phase 2: Keyframes every 4th frame for instantaneous scrubbing coverage
    const keyframes = [];
    for (let i = 4; i < TOTAL_FRAMES - 1; i += 4) {
      keyframes.push(i);
    }
    keyframes.forEach((idx) => loadImage(idx));

    // Phase 3: Stream remaining intermediate frames
    setTimeout(() => {
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (i % 4 !== 0 && i !== TOTAL_FRAMES - 1) {
          loadImage(i);
        }
      }
    }, 120);
  }

  // Nearest Loaded Frame Fallback (prevents blank canvas)
  function getRenderableImage(frameIndex) {
    const idx = Math.min(Math.max(Math.round(frameIndex), 0), TOTAL_FRAMES - 1);
    if (images[idx] && images[idx].complete && images[idx].naturalWidth > 0) {
      return images[idx];
    }
    // Search outward for closest loaded frame
    for (let delta = 1; delta < TOTAL_FRAMES; delta++) {
      const prev = idx - delta;
      if (prev >= 0 && images[prev] && images[prev].complete && images[prev].naturalWidth > 0) {
        return images[prev];
      }
      const next = idx + delta;
      if (next < TOTAL_FRAMES && images[next] && images[next].complete && images[next].naturalWidth > 0) {
        return images[next];
      }
    }
    return null;
  }

  // --- Canvas Sizing with Retina / High-DPI Support ---
  function resizeCanvas() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(viewportWidth * dpr);
    canvas.height = Math.round(viewportHeight * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderCurrentFrame();
  }

  // --- Canvas Layout & Render ---
  // Positions the perfume bottle & falcon on the LEFT side of the screen on desktop,
  // leaving the right side clean, spacious, and atmospheric.
  function renderCurrentFrame() {
    const img = getRenderableImage(currentFrame);
    if (!img) return;

    const W = viewportWidth;
    const H = viewportHeight;

    // Fill background with exact deep luxury black
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, W, H);

    // Source image dimensions (1920 x 1080)
    const imgW = img.naturalWidth || 1920;
    const imgH = img.naturalHeight || 1080;

    let scale, drawW, drawH, drawX, drawY;

    if (W >= 1024) {
      // DESKTOP: Left-aligned hero composition
      scale = Math.max(H / imgH, W / 2300) * 1.02;
      drawW = imgW * scale;
      drawH = imgH * scale;

      // Target subject center at 35% from left edge
      let targetCenterX = W * 0.35;

      // Ensure left wing tip (approx x = 260 in 1920x1080) is preserved with safety padding
      const leftWingOffset = 260 * scale;
      let calculatedDrawX = targetCenterX - (drawW * 0.5);
      const minDrawX = 24 - leftWingOffset;
      if (calculatedDrawX < minDrawX) {
        calculatedDrawX = minDrawX;
      }

      drawX = calculatedDrawX;
      drawY = (H - drawH) * 0.5;

      // Draw the frame
      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // Seamless Edge Feathering: Softly dissolve the right side into dark negative space
      const fadeStart = drawX + drawW * 0.78;
      const fadeWidth = drawW * 0.22 + 4;
      if (fadeStart < W) {
        const edgeGradient = ctx.createLinearGradient(fadeStart, 0, drawX + drawW, 0);
        edgeGradient.addColorStop(0, 'rgba(6, 6, 8, 0)');
        edgeGradient.addColorStop(0.7, 'rgba(6, 6, 8, 0.75)');
        edgeGradient.addColorStop(1, '#060608');
        ctx.fillStyle = edgeGradient;
        ctx.fillRect(fadeStart - 1, 0, fadeWidth, H);
      }

    } else if (W >= 768) {
      // TABLET: Harmonious proportioned composition
      scale = Math.max(H / imgH, W / 1850) * 1.0;
      drawW = imgW * scale;
      drawH = imgH * scale;

      let targetCenterX = W * 0.42;
      const leftWingOffset = 260 * scale;
      let calculatedDrawX = targetCenterX - (drawW * 0.5);
      const minDrawX = 16 - leftWingOffset;
      if (calculatedDrawX < minDrawX) {
        calculatedDrawX = minDrawX;
      }

      drawX = calculatedDrawX;
      drawY = (H - drawH) * 0.5;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      const fadeStart = drawX + drawW * 0.80;
      if (fadeStart < W) {
        const edgeGradient = ctx.createLinearGradient(fadeStart, 0, drawX + drawW, 0);
        edgeGradient.addColorStop(0, 'rgba(6, 6, 8, 0)');
        edgeGradient.addColorStop(1, '#060608');
        ctx.fillStyle = edgeGradient;
        ctx.fillRect(fadeStart - 1, 0, drawW * 0.20 + 4, H);
      }

    } else {
      // MOBILE: Centered product framed to leave elegant negative space below for RAZ
      scale = Math.min((H * 0.68) / 810, 0.72);
      if (scale < 0.52) scale = 0.52;
      drawW = imgW * scale;
      drawH = imgH * scale;

      drawX = (W - drawW) * 0.5;
      // Position eagle head comfortably near top of screen
      drawY = (H * 0.06) - (110 * scale);

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }

    // Synchronize Brand Name Reveal
    updateBrandReveal();
  }

  // --- Brand Name Reveal Logic ---
  // Reveal ONLY after the falcon has completed landing on the perfume bottle.
  // Smoothly fades in and reverses when scrolling upward.
  function updateBrandReveal() {
    if (!brandContainer) return;

    if (currentFrame < LANDING_COMPLETE_FRAME) {
      // Falcon has not yet completed landing: strictly zero text
      brandContainer.style.opacity = '0';
      brandContainer.style.visibility = 'hidden';
      brandContainer.setAttribute('aria-hidden', 'true');
    } else {
      // Falcon has landed: smoothly reveal the brand name RAZ
      const rawProgress = Math.min(
        Math.max((currentFrame - LANDING_COMPLETE_FRAME) / (FULL_REVEAL_FRAME - LANDING_COMPLETE_FRAME), 0),
        1
      );

      // Smoothstep easing for cinematic velvet fade
      const easedProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);

      brandContainer.style.visibility = 'visible';
      brandContainer.setAttribute('aria-hidden', 'false');
      brandContainer.style.opacity = easedProgress.toFixed(3);

      const translateY = (1 - easedProgress) * 22;
      const blur = (1 - easedProgress) * 6;

      if (viewportWidth > 768) {
        brandContainer.style.transform = `translateY(calc(-50% + ${translateY.toFixed(1)}px))`;
      } else {
        brandContainer.style.transform = `translate(-50%, ${translateY.toFixed(1)}px)`;
      }

      brandContainer.style.filter = `blur(${blur.toFixed(1)}px)`;
    }
  }

  // --- Cinematic Single-Click 3D Sequence Player ---
  function playCinematicSequence() {
    if (isCinematicPlaying) return;
    isCinematicPlaying = true;

    const heroActionCue = document.getElementById('heroActionCue');
    const btnSkipCinematic = document.getElementById('btnSkipCinematic');

    if (heroActionCue) {
      heroActionCue.classList.add('fading-out');
    }
    if (btnSkipCinematic) {
      btnSkipCinematic.classList.add('visible');
    }

    // Ensure we are at the top
    if (window.scrollY > 5) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    currentFrame = 0;
    targetFrame = 0;
    renderCurrentFrame();

    const startTimestamp = performance.now();
    const durationMs = 3800; // 3.8s for smooth 240 frames (~63fps)
    const totalFrames = TOTAL_FRAMES - 1; // 239

    function step(now) {
      if (!isCinematicPlaying) return;

      const elapsed = now - startTimestamp;
      const progress = Math.min(elapsed / durationMs, 1);

      // Smooth cinematic sinusoidal ease-in-out curve
      const eased = 0.5 - Math.cos(progress * Math.PI) / 2;

      currentFrame = eased * totalFrames;
      targetFrame = currentFrame;
      renderCurrentFrame();

      if (progress < 1) {
        cinematicAnimationId = requestAnimationFrame(step);
      } else {
        // Full sequence completed
        currentFrame = totalFrames;
        targetFrame = totalFrames;
        renderCurrentFrame();
        isCinematicPlaying = false;

        if (btnSkipCinematic) {
          btnSkipCinematic.classList.remove('visible');
        }

        // Brief cinematic hold (450ms) to admire the landed falcon & RAZ brand reveal
        setTimeout(() => {
          const detailsSection = document.getElementById('detailsSection');
          if (detailsSection) {
            detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 450);
      }
    }

    cinematicAnimationId = requestAnimationFrame(step);
  }

  function skipCinematic() {
    if (!isCinematicPlaying) return;
    if (cinematicAnimationId) {
      cancelAnimationFrame(cinematicAnimationId);
      cinematicAnimationId = null;
    }
    isCinematicPlaying = false;

    currentFrame = TOTAL_FRAMES - 1;
    targetFrame = TOTAL_FRAMES - 1;
    renderCurrentFrame();

    const btnSkipCinematic = document.getElementById('btnSkipCinematic');
    if (btnSkipCinematic) {
      btnSkipCinematic.classList.remove('visible');
    }

    const detailsSection = document.getElementById('detailsSection');
    if (detailsSection) {
      detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function resetToSummit() {
    if (cinematicAnimationId) {
      cancelAnimationFrame(cinematicAnimationId);
      cinematicAnimationId = null;
    }
    isCinematicPlaying = false;

    currentFrame = 0;
    targetFrame = 0;
    renderCurrentFrame();

    const heroActionCue = document.getElementById('heroActionCue');
    const btnSkipCinematic = document.getElementById('btnSkipCinematic');
    if (heroActionCue) heroActionCue.classList.remove('fading-out');
    if (btnSkipCinematic) btnSkipCinematic.classList.remove('visible');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Scroll State Sync ---
  function onScroll() {
    if (isFrameLocked || isCinematicPlaying) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const heroActionCue = document.getElementById('heroActionCue');

    if (scrollTop < 40) {
      // User is at the summit
      if (heroActionCue) heroActionCue.classList.remove('fading-out');
      currentFrame = 0;
      targetFrame = 0;
      renderCurrentFrame();
    } else {
      // User is in or scrolling down into details section
      if (heroActionCue) heroActionCue.classList.add('fading-out');
      currentFrame = TOTAL_FRAMES - 1;
      targetFrame = TOTAL_FRAMES - 1;
      renderCurrentFrame();
    }
  }

  // --- Physics Lerp Render Loop ---
  function renderLoop() {
    if (!isFrameLocked && !isCinematicPlaying) {
      const diff = targetFrame - currentFrame;

      if (Math.abs(diff) > 0.0005) {
        currentFrame += diff * LERP_FACTOR;
        renderCurrentFrame();
      } else if (currentFrame !== targetFrame) {
        currentFrame = targetFrame;
        renderCurrentFrame();
      }
    }

    animationFrameId = requestAnimationFrame(renderLoop);
  }

  // --- Hero Single-Click & Gesture Interactions ---
  function setupHeroInteractions() {
    const heroViewport = document.getElementById('heroViewport');
    const btnHeroPlay = document.getElementById('btnHeroPlay');
    const btnSkipCinematic = document.getElementById('btnSkipCinematic');

    // 1. Direct Play Button Click
    if (btnHeroPlay) {
      btnHeroPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        playCinematicSequence();
      });
    }

    // 2. Skip to Flacon Button Click
    if (btnSkipCinematic) {
      btnSkipCinematic.addEventListener('click', (e) => {
        e.stopPropagation();
        skipCinematic();
      });
    }

    // 3. Single Click anywhere on hero screen
    if (heroViewport) {
      heroViewport.addEventListener('click', (e) => {
        // Exclude site-header clicks
        if (e.target.closest('.site-header') || e.target.closest('#btnSkipCinematic')) return;
        if (isCinematicPlaying) {
          // If already playing, a second click skips straight to the flacon
          skipCinematic();
        } else {
          playCinematicSequence();
        }
      });
    }

    // 4. Single Mouse Wheel down at summit triggers animation
    window.addEventListener('wheel', (e) => {
      if (window.scrollY < 40 && e.deltaY > 0 && !isCinematicPlaying) {
        e.preventDefault();
        playCinematicSequence();
      }
    }, { passive: false });

    // 5. Mobile Touch Swipe at summit triggers animation
    let touchStartY = 0;
    window.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (window.scrollY < 40 && !isCinematicPlaying) {
        const touchCurrentY = e.touches[0].clientY;
        if (touchStartY - touchCurrentY > 25) {
          e.preventDefault();
          playCinematicSequence();
        }
      }
    }, { passive: false });
  }

  // --- Showcase Interactivity & Reservation Modal ---
  function setupShowcaseInteractivity() {
    // 1. Perspectives Switcher
    const perspectiveBtns = document.querySelectorAll('.btn-perspective');
    const showcaseMainImg = document.getElementById('showcaseMainImg');
    const perspectiveCaption = document.getElementById('perspectiveCaption');

    perspectiveBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        perspectiveBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const frameNumber = btn.getAttribute('data-frame');
        const caption = btn.getAttribute('data-caption');
        const paddedFrame = pad(frameNumber, 3);

        if (showcaseMainImg) {
          showcaseMainImg.style.opacity = '0.4';
          showcaseMainImg.src = `3D%20VIDEO%20HEROSECTION/ezgif-frame-${paddedFrame}.png`;
          showcaseMainImg.onload = () => {
            showcaseMainImg.style.opacity = '1';
          };
          showcaseMainImg.onerror = () => {
            showcaseMainImg.src = `frames/ezgif-frame-${paddedFrame}.png`;
            showcaseMainImg.style.opacity = '1';
          };
        }

        if (perspectiveCaption && caption) {
          perspectiveCaption.textContent = caption;
        }
      });
    });

    // 2. Comprehensive Purchase & WhatsApp Order Configuration
    let selectedMl = '100ml';
    let unitPrice = 500;
    let selectedPiece = '1 Piece (Single Bottle)';
    let bottleCount = 1;
    let whatsappPhone = localStorage.getItem('raz_whatsapp_phone') || '919876543210';

    const sizeBtns = document.querySelectorAll('.btn-size');
    const pieceBtns = document.querySelectorAll('.btn-piece');
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    const qtyDisplay = document.getElementById('qtyDisplay');
    const quickQtyBtns = document.querySelectorAll('.btn-quick-qty');

    const summaryVolume = document.getElementById('summaryVolume');
    const summaryPiece = document.getElementById('summaryPiece');
    const summaryBottleCount = document.getElementById('summaryBottleCount');
    const summaryTotal = document.getElementById('summaryTotal');
    const btnWaBadge = document.getElementById('btnWaBadge');
    const productPrice = document.getElementById('productPrice');
    const orderNowWhatsAppBtn = document.getElementById('orderNowWhatsAppBtn');
    const targetPhoneDisplay = document.getElementById('targetPhoneDisplay');
    const btnEditPhone = document.getElementById('btnEditPhone');

    function formatPhoneDisplay(num) {
      if (num.length >= 12 && num.startsWith('91')) {
        return `+91 ${num.slice(2, 7)} ${num.slice(7)}`;
      }
      return `+${num}`;
    }

    if (targetPhoneDisplay) {
      targetPhoneDisplay.textContent = formatPhoneDisplay(whatsappPhone);
    }

    function updateOrderCalculations() {
      const totalAmount = unitPrice * bottleCount;
      const formattedTotal = `₹${totalAmount.toLocaleString('en-IN')}`;

      if (qtyDisplay) qtyDisplay.textContent = String(bottleCount);
      if (summaryVolume) summaryVolume.textContent = selectedMl === '100ml' ? '100 ML (Grand Obsidian Flacon)' : '50 ML (Voyage Obsidian Flacon)';
      if (summaryPiece) summaryPiece.textContent = selectedPiece;
      if (summaryBottleCount) summaryBottleCount.textContent = `${bottleCount} Bottle${bottleCount > 1 ? 's' : ''}`;
      if (summaryTotal) summaryTotal.textContent = `${formattedTotal} INR`;
      if (btnWaBadge) btnWaBadge.textContent = formattedTotal;
      if (productPrice) productPrice.textContent = String(unitPrice);

      // Synchronize quick qty button states
      quickQtyBtns.forEach((btn) => {
        const q = parseInt(btn.getAttribute('data-qty'), 10);
        if (q === bottleCount) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // Size (ML) selection
    sizeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        sizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        selectedMl = btn.getAttribute('data-ml');
        unitPrice = parseInt(btn.getAttribute('data-unitprice'), 10) || 500;
        updateOrderCalculations();
      });
    });

    // Pieces / Pack selection
    pieceBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        pieceBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        selectedPiece = btn.getAttribute('data-pieces');
        updateOrderCalculations();
      });
    });

    // Bottle Quantity Stepper
    if (qtyMinus) {
      qtyMinus.addEventListener('click', () => {
        if (bottleCount > 1) {
          bottleCount--;
          updateOrderCalculations();
        }
      });
    }

    if (qtyPlus) {
      qtyPlus.addEventListener('click', () => {
        if (bottleCount < 99) {
          bottleCount++;
          updateOrderCalculations();
        }
      });
    }

    // Quick Quantity Buttons
    quickQtyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = parseInt(btn.getAttribute('data-qty'), 10);
        if (!isNaN(q) && q > 0) {
          bottleCount = q;
          updateOrderCalculations();
        }
      });
    });

    // WhatsApp Order Click Action
    if (orderNowWhatsAppBtn) {
      orderNowWhatsAppBtn.addEventListener('click', () => {
        const totalAmount = unitPrice * bottleCount;
        const formattedTotal = `₹${totalAmount.toLocaleString('en-IN')} INR`;

        const waMessage = 
`*❖ ORDER: RAZ OUD EXTRAIT DE PARFUM ❖*

Hello RAZ Parfums, I would like to place an order:

• *Product:* RAZ OUD Royal Obsidian Flacon
• *Size / Volume:* ${selectedMl.toUpperCase()} (₹${unitPrice} per bottle)
• *Package Set:* ${selectedPiece}
• *Quantity:* ${bottleCount} Bottle(s)
• *Total Amount:* ${formattedTotal}

Please confirm my private allocation and dispatch instructions. Thank you!`;

        const cleanPhone = whatsappPhone.replace(/[^0-9]/g, '');
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;

        // Direct WhatsApp redirect in a new tab
        window.open(waUrl, '_blank');
      });
    }

    // Change WhatsApp Number
    if (btnEditPhone) {
      btnEditPhone.addEventListener('click', () => {
        const currentNum = whatsappPhone;
        const newNum = prompt('Enter WhatsApp Phone Number with Country Code (e.g. 919876543210 for India):', currentNum);
        if (newNum && newNum.trim()) {
          const cleaned = newNum.replace(/[^0-9]/g, '');
          if (cleaned.length >= 10) {
            whatsappPhone = cleaned;
            localStorage.setItem('raz_whatsapp_phone', cleaned);
            if (targetPhoneDisplay) targetPhoneDisplay.textContent = formatPhoneDisplay(cleaned);
            alert(`WhatsApp orders will now be routed to: +${cleaned}`);
          } else {
            alert('Please enter a valid phone number with country code (e.g. 919876543210).');
          }
        }
      });
    }

    // Header Acquire button scrolls directly to purchase panel
    const headerAcquireBtn = document.getElementById('headerAcquireBtn');
    if (headerAcquireBtn) {
      headerAcquireBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const purchasePanel = document.getElementById('purchasePanel');
        if (purchasePanel) {
          purchasePanel.scrollIntoView({ behavior: 'smooth' });
          purchasePanel.style.boxShadow = '0 0 35px rgba(212, 175, 55, 0.5)';
          setTimeout(() => {
            purchasePanel.style.boxShadow = '';
          }, 1800);
        }
      });
    }

    // Initial calculation trigger
    updateOrderCalculations();

    // 4. Smooth Navigation
    const returnTopBtn = document.getElementById('returnTopBtn');
    const headerBrand = document.getElementById('headerBrand');
    const navHero = document.getElementById('navHero');

    function scrollToTop(e) {
      if (e) e.preventDefault();
      resetToSummit();
    }

    if (returnTopBtn) returnTopBtn.addEventListener('click', scrollToTop);
    if (headerBrand) headerBrand.addEventListener('click', scrollToTop);
    if (navHero) navHero.addEventListener('click', scrollToTop);

    const navDetails = document.getElementById('navDetails');
    if (navDetails) {
      navDetails.addEventListener('click', (e) => {
        e.preventDefault();
        const detailsSection = document.getElementById('detailsSection');
        if (detailsSection) {
          detailsSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  // --- Initialization ---
  function init() {
    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // Check optional URL parameters for testing / direct verification
    const urlParams = new URLSearchParams(window.location.search);
    const frameParam = parseInt(urlParams.get('frame'), 10);
    const scrollParam = parseFloat(urlParams.get('scroll'));

    if (!isNaN(frameParam)) {
      isFrameLocked = true;
      const clamped = Math.min(Math.max(frameParam, 0), TOTAL_FRAMES - 1);
      targetFrame = clamped;
      currentFrame = clamped;
    } else if (!isNaN(scrollParam)) {
      const clamped = Math.min(Math.max(scrollParam, 0), 1);
      targetFrame = clamped * (TOTAL_FRAMES - 1);
      currentFrame = targetFrame;
    }

    resizeCanvas();
    preloadAllFrames();
    setupHeroInteractions();
    setupShowcaseInteractivity();

    if (!isFrameLocked && isNaN(scrollParam)) {
      onScroll();
    }

    renderCurrentFrame();
    renderLoop();
  }

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
