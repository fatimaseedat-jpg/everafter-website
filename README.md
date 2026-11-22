# Ever After Events

A responsive, self-hosted event website with an illustrated, scroll-driven Three.js opening followed by a conventional services, gallery and enquiry page. Plain HTML, CSS and browser ES modules; no package installation or build step.

## Preview

From this directory, run the command verified on this Mac:

```sh
ruby -run -e httpd . -p 5173 -b 127.0.0.1
```

Open <http://localhost:5173>. Use an HTTP server rather than opening `index.html` directly: browser ES modules require HTTP.

## Deploy

Publish `index.html`, `styles.css`, `world.css`, `js/` and `assets/` to any static web host. No server-side application or build output is required. The existing WordPress site is not changed by this local project. The prototype image, `.omp/` and this README do not need to be published.

## Behaviour

- Service details lead into an enquiry with the occasion already selected.
- The enquiry validates the name, email and optional event date, then presents an editable summary. The visitor explicitly chooses WhatsApp or email and sends from their own app. There is no form backend, automatic submission, analytics, storage of enquiries or claimed delivery confirmation.
- The gallery supports category filters, a native-dialog lightbox, previous/next navigation, arrow keys and Escape. Navigation stays within the selected category.
- The opening is one connected, procedural Three.js estate: an overview, a wedding garden, a celebration terrace and an event pavilion. Normal scrolling moves a continuous orthographic camera through it. Chapter buttons select views, and “Skip to our services” bypasses the experience. There is no wheel/touch interception or generated video.
- The opening is bounded; all normal sections remain below it. Live reduced-motion preferences and short viewports use static, selectable camera views without the long scroll track. Mode changes preserve the selected view or the visitor’s position in the following content.
- Rendering runs only while a view changes and stops when settled, offscreen or hidden. If WebGL is unavailable or its context is lost, a real rendered poster replaces the canvas and the long track disappears. Enquiries and the rest of the website do not depend on WebGL.
- Fonts, photographs and the pinned Three.js dependency are served locally. The site does not need third-party CDNs at runtime.

## Files

- `index.html`: business content, accessible landmarks, native dialogs, metadata.
- `styles.css`: shared design tokens, typography and normal responsive sections.
- `world.css`: cinematic stage, chapter content and responsive world layout.
- `js/main.js`: mobile navigation, service details and enquiry preparation.
- `js/gallery.js`: filtered gallery and lightbox controls.
- `js/world.js`: native-scroll synchronization, chapter controls, responsive modes and renderer lifecycle.
- `js/celebration-scene.js`: procedural geometry, lighting and the continuous camera route.
- `assets/`: local imagery, fonts, icon and vendor files.

## Sources and licenses

Business information, logo and photographs come from <https://everafterevents.online/>. Photography is reused from the existing site and its gallery; the new gallery does not claim that every image represents a commissioned client event. Confirm publication rights before deployment.

The miniature estate is an original procedural illustration, not a real venue or a photographed client project. The continuous-journey concept is inspired by [scroll-world](https://github.com/oso95/scroll-world); this implementation uses real Three.js geometry rather than that project’s paid AI-video pipeline.

Three.js **0.180.0** is MIT-licensed; see `assets/vendor/THREE-LICENSE.txt`. Cormorant Garamond and Manrope are distributed under the SIL Open Font License; copies are in `assets/fonts/`.

## Verification

Exercised in Chromium: the four camera chapters and reverse navigation; enquiry presets from the scene; the skip link; mobile navigation; viewport/orientation boundaries from 320px to 1800px; reduced-motion changes inside and below the opening; demand-driven rendering at rest; unavailable WebGL and mid-journey context loss. The existing gallery, service dialogs, required-field/name/date validation, prepared WhatsApp/email messages and enquiry editing were also exercised. No messages were sent during verification.
