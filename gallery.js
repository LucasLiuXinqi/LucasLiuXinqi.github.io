(function () {
  var GAP = 8;
  var TARGET = 280; // target row height in px

  // Balance all rows together so a resize cannot strand the last photo.
  function rowSizes(count, width) {
    if (!count) return [];
    var preferred = width >= 1000 ? 5 : width >= 760 ? 4 : width >= 540 ? 3 : width >= 300 ? 2 : 1;
    var rows = Math.ceil(count / preferred);
    if (width >= 760 && Math.ceil(count / 5) <= Math.floor(count / 4)) {
      rows = preferred === 5 ? Math.ceil(count / 5) : Math.floor(count / 4);
    }
    var base = Math.floor(count / rows);
    var extra = count % rows;
    return Array.from({ length: rows }, function (_, i) { return base + (i < extra ? 1 : 0); });
  }

  function setupGallery(grid) {
    var links = Array.from(grid.querySelectorAll('.gallery-photo'));
    var dialog = document.querySelector('.photo-viewer');
    var current = 0;
    var opener;
    var oldOverflow;
    var scrollPosition;

    function render() {
      var source = links[current].querySelector('img');
      var image = dialog.querySelector('.photo-viewer__image');
      image.src = source.src;
      image.alt = source.alt;
      dialog.querySelector('.photo-viewer__position').textContent = (current + 1) + ' / ' + links.length;
    }

    if (dialog && typeof dialog.showModal === 'function') {
      grid.addEventListener('click', function (event) {
        var link = event.target.closest('.gallery-photo');
        if (!link || !links.includes(link) || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        current = links.indexOf(link);
        opener = link;
        render();
        oldOverflow = document.body.style.overflow;
        scrollPosition = { x: window.scrollX, y: window.scrollY };
        document.body.style.overflow = 'hidden';
        dialog.showModal();
        dialog.querySelector('.photo-viewer__close').focus();
      });
      function advance(delta) {
        current = (current + delta + links.length) % links.length;
        render();
      }
      dialog.querySelector('.photo-viewer__close').addEventListener('click', function () { dialog.close(); });
      dialog.querySelector('.photo-viewer__previous').addEventListener('click', function () { advance(-1); });
      dialog.querySelector('.photo-viewer__next').addEventListener('click', function () { advance(1); });
      dialog.addEventListener('keydown', function (event) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          advance(event.key === 'ArrowLeft' ? -1 : 1);
        }
      });
      dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });
      dialog.addEventListener('close', function () {
        document.body.style.overflow = oldOverflow;
        if (opener) opener.focus({ preventScroll: true });
        if (scrollPosition) window.scrollTo(scrollPosition.x, scrollPosition.y);
      });
    }

    return function () {
      if (!grid.clientWidth) return;
      var focused = document.activeElement;
      var restoreFocus = links.includes(focused);
      var offset = 0;
      grid.replaceChildren();
      rowSizes(links.length, grid.clientWidth).forEach(function (size) {
        var row = document.createElement('div');
        row.className = 'photo-row';
        links.slice(offset, offset + size).forEach(function (link) {
          var img = link.querySelector('img');
          link.style.aspectRatio = img.dataset.w + ' / ' + img.dataset.h;
          link.style.flexGrow = +img.dataset.w / +img.dataset.h;
          row.appendChild(link);
        });
        offset += size;
        grid.appendChild(row);
      });
      grid.classList.add('gallery-ready');
      if (restoreFocus) focused.focus({ preventScroll: true });
    };
  }

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
    document.querySelectorAll('.photo-grid').forEach(function (grid) {
      if (grid.classList.contains('photo-grid--interactive')) {
        if (!grid.galleryLayout) grid.galleryLayout = setupGallery(grid);
        grid.galleryLayout();
      } else {
        layoutGrid(grid);
      }
    });
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
