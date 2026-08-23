window.addEventListener('load', () => {
  const loader = document.querySelector('.page-loader');
  loader.style.opacity = '0';
  setTimeout(() => {
    loader.style.display = 'none';
  }, 500);
});
