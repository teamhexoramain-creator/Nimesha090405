/* HEXORA — on-screen number pad for PIN boxes (touch screens only).
   On a phone, tapping a PIN box used to open the phone's own keyboard, which covers half the screen. Here the PIN boxes
   (.acc-pin, [data-numpad]) do not open the keyboard; a number pad slides up from the bottom of the page instead.
   With a mouse / physical keyboard nothing changes: the boxes are normal inputs.
   Loaded by account.html and admin.html. The boxes keep working with their own handlers: this only writes the digits into
   the box and fires a normal "input" event. */
(function () {
  "use strict";
  if (!window.matchMedia || !window.matchMedia("(pointer: coarse)").matches) return;
  const SEL = ".acc-pin, [data-numpad]";
  let pad = null, target = null, closeT = 0;

  // no phone keyboard on these boxes (inputmode none + read-only), as soon as they exist
  function prepare(root) {
    (root.matches && root.matches(SEL) ? [root] : []).concat(Array.from(root.querySelectorAll ? root.querySelectorAll(SEL) : [])).forEach(i => {
      if (i.dataset.np) return; i.dataset.np = "1";
      i.setAttribute("inputmode", "none"); i.readOnly = true; i.setAttribute("autocomplete", "off");
    });
  }
  function build() {
    const el = document.createElement("div");
    el.className = "numpad"; el.setAttribute("role", "group"); el.setAttribute("aria-label", "PIN number pad");
    el.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => '<button type="button" data-k="' + n + '">' + n + "</button>").join("") +
      '<button type="button" data-k="done" class="np-done" aria-label="වසන්න">✓</button><button type="button" data-k="0">0</button>' +
      '<button type="button" data-k="back" aria-label="මකන්න"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
    // taps on the pad must not take the focus away from the box
    el.addEventListener("pointerdown", e => e.preventDefault());
    el.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b) press(b.dataset.k); });
    document.body.appendChild(el);
    return el;
  }
  function open(input) {
    clearTimeout(closeT);
    target = input;
    if (!pad) pad = build();
    document.documentElement.classList.add("numpad-open");
    requestAnimationFrame(() => { pad.classList.add("on"); try { input.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { /* old browser */ } });
  }
  function close() {
    target = null;
    if (!pad) return;
    pad.classList.remove("on"); document.documentElement.classList.remove("numpad-open");
  }
  function press(k) {
    if (!target) return;
    if (k === "done") { target.blur(); close(); return; }
    const max = Number(target.getAttribute("maxlength")) || 12;
    let v = target.value;
    if (k === "back") v = v.slice(0, -1); else if (v.length < max) v += k;
    target.value = v;
    target.dispatchEvent(new Event("input", { bubbles: true }));
    if (k !== "back" && v.length >= max) next();
  }
  // a full PIN moves on to the next PIN box (e.g. "type it again"), or closes the pad
  function next() {
    const all = Array.from(document.querySelectorAll(SEL)).filter(i => i.offsetParent !== null && !i.disabled);
    const n = all[all.indexOf(target) + 1];
    if (n && !n.value) n.focus({ preventScroll: true }); else { target.blur(); close(); }
  }

  document.addEventListener("focusin", e => { if (e.target.matches && e.target.matches(SEL)) open(e.target); });
  document.addEventListener("focusout", e => {
    if (!(e.target.matches && e.target.matches(SEL))) return;
    clearTimeout(closeT); closeT = setTimeout(() => { if (!document.activeElement || !document.activeElement.matches || !document.activeElement.matches(SEL)) close(); }, 120);
  });
  // a tap outside the boxes and the pad closes it
  document.addEventListener("pointerdown", e => { if (target && !e.target.closest(SEL + ", .numpad, .pin-eye")) { target.blur(); close(); } }, true);

  prepare(document);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) prepare(n); }))).observe(document.documentElement, { childList: true, subtree: true });
})();
