(() => {
  const root=document.documentElement,buttons=[...document.querySelectorAll('[data-theme-toggle]')];
  let saved='light';
  try{saved=localStorage.getItem('optics-theme')||'light'}catch{}
  function apply(theme){root.dataset.theme=theme;const dark=theme==='dark';for(const button of buttons){button.textContent=dark?'☀ 淺色模式':'☾ 暗黑模式';button.setAttribute('aria-pressed',String(dark));button.title=dark?'切換為淺色模式':'切換為暗黑模式'}window.dispatchEvent(new Event('themechange'))}
  apply(saved==='dark'?'dark':'light');
  for(const button of buttons)button.addEventListener('click',()=>{const theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('optics-theme',theme)}catch{}apply(theme)});
})();
