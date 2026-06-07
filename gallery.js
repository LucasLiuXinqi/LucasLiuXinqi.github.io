(function () {
  var GAP = 8;
  var TARGET = 280; // target row height in px

  function layoutGrid(grid) {
    // Collect images (may live inside .photo-row from a prior layout pass)
    var imgs = Array.from(grid.querySelectorAll('img[data-w]'));
    var W = grid.clientWidth;
    if (!W || !imgs.length) return;

    // Detach images, clear old row wrappers
    grid.innerHTML = '';

    var row = [];
    var sumRatio = 0;

    function commitRow(images, isLast) {
      if (!images.length) return;

      var gaps = GAP * (images.length - 1);
      var localSum = images.reduce(function (s, img) {
        return s + (+img.dataset.w / +img.dataset.h);
      }, 0);

      // Short last row: don't stretch, keep at target height
      var stretch = !(isLast && localSum * TARGET + gaps < W * 0.8);

      var rowDiv = document.createElement('div');
      rowDiv.className = 'photo-row';

      images.forEach(function (img) {
        var r = +img.dataset.w / +img.dataset.h;
        // Let CSS aspect-ratio hold the shape; flex-grow fills width
        img.style.aspectRatio = img.dataset.w + ' / ' + img.dataset.h;
        img.style.minWidth = '0';

        if (stretch) {
          img.style.flexGrow  = r;   // proportional growth = same height for all
          img.style.flexBasis = '0';
          img.style.height    = '';
          img.style.width     = '';
        } else {
          img.style.flexGrow  = '0';
          img.style.flexBasis = 'auto';
          img.style.height    = TARGET + 'px';
          img.style.width     = 'auto';
        }

        rowDiv.appendChild(img);
      });

      grid.appendChild(rowDiv);
    }

    imgs.forEach(function (img) {
      var r = +img.dataset.w / +img.dataset.h;
      row.push(img);
      sumRatio += r;
      if (sumRatio * TARGET + GAP * (row.length - 1) >= W) {
        commitRow(row, false);
        row = []; sumRatio = 0;
      }
    });
    commitRow(row, true); // flush remaining images
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
