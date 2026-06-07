(function () {
  var GAP = 8;
  var TARGET = 280; // target row height in px

  function layoutGrid(grid) {
    var imgs = Array.from(grid.querySelectorAll('img[data-w]'));
    var W = grid.clientWidth;
    if (!W || !imgs.length) return;

    var row = [];
    var sumRatio = 0;

    function flushRow(isLast) {
      if (!row.length) return;
      var gaps = GAP * (row.length - 1);
      var h = (isLast && sumRatio * TARGET + gaps < W * 0.85)
        ? TARGET
        : (W - gaps) / sumRatio;
      row.forEach(function (img) {
        var r = +img.dataset.w / +img.dataset.h;
        img.style.width  = (h * r).toFixed(1) + 'px';
        img.style.height = h.toFixed(1) + 'px';
      });
      row = []; sumRatio = 0;
    }

    imgs.forEach(function (img) {
      var r = +img.dataset.w / +img.dataset.h;
      row.push(img);
      sumRatio += r;
      if (sumRatio * TARGET + GAP * (row.length - 1) >= W) flushRow(false);
    });
    flushRow(true);
  }

  function runAll() {
    document.querySelectorAll('.photo-grid').forEach(layoutGrid);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll);
  } else {
    runAll();
  }

  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(runAll, 150);
  });
})();
