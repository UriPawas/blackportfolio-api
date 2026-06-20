(function(){
  var s=localStorage.getItem('bp-theme');
  var d=window.matchMedia('(prefers-color-scheme:dark)').matches;
  document.documentElement.setAttribute('data-theme', s || (d ? 'dark' : 'light'));
})();
