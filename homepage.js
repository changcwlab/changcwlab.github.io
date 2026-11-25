(() => {
  'use strict';
  const language = () => document.documentElement.dataset.lang === 'zh' ? 'zh' : 'en';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const film = document.getElementById('intro-film');
  const sound = document.getElementById('film-sound');
  const soundLabel = sound.querySelector('.sound-label');
  const filmNotice = document.getElementById('film-notice');
  const chapterList = document.querySelector('.film-chapters');
  const chapters = Array.from(chapterList.querySelectorAll('button'));
  const synthesisChapter = chapterList.querySelector('[data-synthesis]');
  const playButton = document.getElementById('film-play');
  const playLabel = playButton.querySelector('.play-label');
  const disclosure = chapterList.closest('details');
  const requestedKey = new URLSearchParams(location.search).get('film');
  const requestedChapter = chapters.find(button => button.dataset.filmKey === requestedKey);
  const filmEdition = 'cwc-research-film-7';
  let keepChapter = Boolean(requestedChapter);
  let playedHere = false;
  let heardSound = false;
  let triedAutoplay = false;

  const soundLabels = {
    first: {en: 'Play with sound', zh: '從頭有聲播放'},
    sound: {en: 'Turn sound on', zh: '開啟聲音'},
    resume: {en: 'Resume with sound', zh: '繼續有聲播放'},
    mute: {en: 'Mute sound', zh: '靜音'},
    replay: {en: 'Replay with sound', zh: '有聲重播'}
  };

  function updateSoundLabel() {
    const audible = !film.muted && film.volume > 0;
    let action = heardSound ? 'sound' : 'first';
    if (film.ended) action = 'replay';
    else if (audible) action = film.paused ? 'resume' : 'mute';
    if (keepChapter && action === 'first') action = 'sound';
    soundLabel.textContent = soundLabels[action][language()];
    playButton.hidden = !film.paused || film.ended;
    const resume = film.currentTime > .5;
    playLabel.textContent = language() === 'zh'
      ? (resume ? '繼續播放' : '播放影片')
      : (resume ? 'Resume film' : 'Play film');
    sound.title = soundLabel.textContent;
  }

  function setCaptions() {
    const target = language() === 'zh' ? 'zh-Hant' : 'en';
    const selected = Array.from(film.querySelectorAll('track')).find(el => el.srclang === target);
    if (!selected) return;
    for (const track of Array.from(film.textTracks)) {
      track.mode = track === selected.track ? 'showing' : 'disabled';
    }
  }

  function hasPlayed() {
    if (playedHere || history.state?.cwcFilmEdition === filmEdition) return true;
    try { return sessionStorage.getItem(filmEdition) === 'played'; }
    catch { return false; }
  }

  function rememberPlaying() {
    playedHere = true;
    try { sessionStorage.setItem(filmEdition, 'played'); } catch {}
    try { history.replaceState({...history.state, cwcFilmEdition: filmEdition}, '', location.href); } catch {}
  }

  function trackSound() {
    if (!film.paused && !film.muted && film.volume > 0) heardSound = true;
    updateSoundLabel();
  }

  function showActiveChapter() {
    const time = film.currentTime + .001;
    const active = chapters.reduce((selected, button) =>
      Number(button.dataset.start) <= time ? button : selected, chapters[0]);

    for (const button of chapters) {
      if (button === active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }
  }

  function playOnRequest() {
    triedAutoplay = true;
    filmNotice.hidden = true;
    film.play().catch(error => {
      if (error.name === 'AbortError') return;
      filmNotice.textContent = language() === 'zh' ? '請點影片內的播放鍵繼續。' : 'Use the play button on the film to continue.';
      filmNotice.hidden = false;
      updateSoundLabel();
    });
  }

  sound.addEventListener('click', () => {
    if (!film.ended && !film.paused && !film.muted && film.volume > 0) {
      film.muted = true;
    } else {
      if ((!keepChapter && !heardSound) || film.ended) film.currentTime = 0;
      if (film.volume === 0) film.volume = 1;
      film.muted = false;
      playOnRequest();
    }
    updateSoundLabel();
  });

  playButton.addEventListener('click', playOnRequest);

  for (const button of chapters) {
    button.addEventListener('click', () => {
      keepChapter = true;
      film.currentTime = Number(button.dataset.start);
      disclosure.open = false;
      disclosure.querySelector('summary').focus({preventScroll: true});
      playOnRequest();
    });
  }

  film.addEventListener('playing', rememberPlaying, {once: true});
  film.addEventListener('playing', () => { filmNotice.hidden = true; trackSound(); });
  film.addEventListener('volumechange', trackSound);
  film.addEventListener('pause', updateSoundLabel);
  film.addEventListener('ended', updateSoundLabel);
  function prepareFilm() {
    setCaptions();
    if (requestedChapter) {
      film.currentTime = reducedMotion.matches && requestedChapter === synthesisChapter
        ? 53 : Number(requestedChapter.dataset.start);
      showActiveChapter();
      playOnArrival();
    }
  }
  film.addEventListener('timeupdate', showActiveChapter);
  film.addEventListener('seeked', () => { showActiveChapter(); updateSoundLabel(); });

  let filmVisible = false;
  function playOnArrival() {
    if (!filmVisible || document.hidden || triedAutoplay || reducedMotion.matches) return;
    if (requestedChapter ? film.readyState === 0 : hasPlayed()) return;
    triedAutoplay = true;
    film.muted = true;
    film.play().catch(updateSoundLabel);
  }
  const filmObserver = new IntersectionObserver(entries => {
    filmVisible = entries[entries.length - 1].intersectionRatio >= .3;
    playOnArrival();
  }, {threshold: [0, .3]});
  filmObserver.observe(film);
  document.addEventListener('visibilitychange', playOnArrival);
  if (film.readyState >= 1) prepareFilm();
  else film.addEventListener('loadedmetadata', prepareFilm, {once: true});
  document.getElementById('research-film').dataset.filmReady = 'true';

  const section = document.getElementById('research');
  const list = section.querySelector('.program-tabs');
  const deck = section.querySelector('.program-panels');
  const tabs = Array.from(list.querySelectorAll('[role=tab]'));
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const fields = panels.map(panel => panel.querySelector('.illustration-field'));
  const rotate = document.getElementById('rotate-topics');
  const rotateLabel = rotate.querySelector('.rotate-label');
  const interval = 9000;
  let current = -1;
  let rotating = !reducedMotion.matches;
  let visible = false;
  let fieldVisible = false;
  let illustrationPlayed = false;
  let keyboardInput = false;
  let timer;
  let progress;

  function playIllustration() {
    const panel = panels[current];
    if (panel.classList.contains('motion-playing')) {
      panel.classList.remove('motion-playing');
      // Flush the old animation state so even a mid-animation replay starts at frame one.
      getComputedStyle(fields[current].querySelector('.topic-motion')).visibility;
    }
    panel.classList.add('motion-playing');
    illustrationPlayed = true;
  }

  function playVisibleIllustration() {
    if (fieldVisible && !illustrationPlayed && rotating && !reducedMotion.matches && !document.hidden) {
      playIllustration();
    }
  }

  const fieldObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.target === fields[current]) {
        fieldVisible = entry.intersectionRatio >= .3;
        playVisibleIllustration();
      }
    }
  }, {threshold: [0, .3]});

  const replayTemplate = document.getElementById('replay-control');
  for (const panel of panels) {
    const button = replayTemplate.content.firstElementChild.cloneNode(true);
    panel.querySelector('figcaption').append(button);
    button.addEventListener('click', () => {
      playIllustration();
      schedule();
    });
  }

  // While the film plays, its timecode also guides the research illustration.
  // A visitor who chooses a research tab takes control until rotation is resumed.
  let followsFilm = true;
  let lastFilmTopic = -1;
  function syncResearch() {
    if (!rotating || !followsFilm || film.paused || film.ended) return;
    const chapter = chapters.filter(button => Number(button.dataset.start) <= film.currentTime + .001).at(-1);
    const id = chapter?.dataset.topic;
    const index = id ? tabs.findIndex(tab => tab.id === id) : -1;
    if (index >= 0 && lastFilmTopic !== index) show(index);
    lastFilmTopic = index;
  }
  film.addEventListener('timeupdate', syncResearch);
  film.addEventListener('playing', () => { lastFilmTopic = -1; syncResearch(); schedule(); });
  film.addEventListener('pause', schedule);
  film.addEventListener('ended', schedule);

  function schedule() {
    clearTimeout(timer);
    progress?.cancel();
    if (!rotating || !visible || document.hidden || (followsFilm && !film.paused && !film.ended)) return;
    if (!reducedMotion.matches) {
      progress = tabs[current].querySelector('.tab-elapsed').animate?.(
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: interval, easing: 'linear', fill: 'forwards' }
      );
    }
    timer = setTimeout(() => show((current + 1) % tabs.length), interval);
  }

  function updateRotationLabel() {
    const labels = language() === 'zh'
      ? ['播放輪播', '暫停輪播']
      : ['Play rotation', 'Pause rotation'];
    rotateLabel.textContent = labels[Number(rotating)];
    rotate.dataset.state = rotating ? 'playing' : 'paused';
    section.dataset.rotation = rotate.dataset.state;
    deck.setAttribute('aria-live', rotating ? 'off' : 'polite');
  }

  function setRotation(enabled) {
    rotating = enabled;
    followsFilm = enabled;
    lastFilmTopic = -1;
    if (enabled) syncResearch();
    updateRotationLabel();
    if (enabled) playVisibleIllustration();
    else panels[current]?.classList.remove('motion-playing');
    schedule();
  }

  function show(index) {
    const changed = current !== index;
    if (changed) {
      if (current >= 0) {
        fieldObserver.unobserve(fields[current]);
        panels[current].classList.remove('motion-playing');
      }
      fieldVisible = false;
      illustrationPlayed = false;
    }
    current = index;
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].toggleAttribute('inert', !active);
      panels[i].setAttribute('aria-hidden', String(!active));
      panels[i].tabIndex = active ? 0 : -1;
      panels[i].classList.toggle('entering', active && changed);
    });
    if (changed) fieldObserver.observe(fields[current]);
    schedule();
  }

  // Pointer selection restarts the reading interval. Keyboard readers control advancement.
  document.addEventListener('pointerdown', () => { keyboardInput = false; }, { capture: true });
  document.addEventListener('keydown', () => { keyboardInput = true; }, { capture: true });
  section.addEventListener('focusin', event => {
    if (keyboardInput && event.target !== rotate) setRotation(false);
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      setRotation(false);
      show(index);
      if (!reducedMotion.matches) playIllustration();
    });
    tab.addEventListener('keydown', event => {
      let next;
      switch (event.key) {
        case 'Home': next = 0; break;
        case 'End': next = tabs.length - 1; break;
        case 'ArrowDown':
        case 'ArrowRight': next = (index + 1) % tabs.length; break;
        case 'ArrowUp':
        case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break;
        default: return;
      }
      event.preventDefault();
      setRotation(false);
      show(next);
      tabs[next].focus();
    });
  });
  rotate.addEventListener('click', () => setRotation(!rotating));
  document.addEventListener('visibilitychange', schedule);
  document.addEventListener('visibilitychange', playVisibleIllustration);
  reducedMotion.addEventListener('change', event => {
    if (event.matches) setRotation(false);
  });

  const researchObserver = new IntersectionObserver(entries => {
    const nowVisible = entries[entries.length - 1].intersectionRatio >= .22;
    if (visible !== nowVisible) {
      visible = nowVisible;
      schedule();
    }
  }, { threshold: [0, .22] });

  const aiIndex = tabs.indexOf(document.getElementById('tab-ai'));
  function followResearchLink() {
    if (location.hash === '#ai') { followsFilm = false; show(aiIndex); }
    if (location.hash === '#microscopy') {
      followsFilm = false;
      show(aiIndex);
      section.scrollIntoView({block:'start'});
    }
  }
  window.addEventListener('hashchange', followResearchLink);

  function translate() {
    updateSoundLabel();
    setCaptions();
    updateRotationLabel();
    const isZh = language() === 'zh';
    chapterList.setAttribute('aria-label', isZh ? chapterList.dataset.labelZh : chapterList.dataset.labelEn);
    list.setAttribute('aria-label', isZh ? list.dataset.labelZh : list.dataset.labelEn);
    for (const item of document.querySelectorAll('[data-alt-en]')) {
      item.alt = isZh ? item.dataset.altZh : item.dataset.altEn;
    }
  }
  document.addEventListener('cwc-language', translate);
  section.dataset.carouselReady = 'true';
  show(0);
  followResearchLink();
  translate();
  researchObserver.observe(deck);
})();
