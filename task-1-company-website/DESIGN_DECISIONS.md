# Tulip & Twine: Design Decisions

Notes on how the Week 1 single-page landing site became the four-page Week 2 company website, and why.

## 1. Brand identity kept from the original

The starting point was the existing Tulip & Twine landing page. Nothing about the brand was changed:

- the name, tulip logo and favicon
- the cream and pastel palette with a deep rose accent
- the Fredoka and Outfit typefaces
- the seven original images (six craft photographs and the illustrated maker avatar)
- the original copy for the hero, craft categories, services, custom orders, story and "Why handmade"
- the cut-paper blob shapes, washi-tape details, sparkles and shimmer buttons

New pages reuse the existing components (section headings, service cards, numbered cards, pill chips, the blob photo crop) so they look like part of the same site.

## 2. Colour and typography

| Token | Value | Used for |
| --- | --- | --- |
| Cream | `#FCF9F5` | Page background |
| White | `#FFFFFF` | Cards and alternating sections |
| Deep Rose | `#C85278` | Buttons, links, accents |
| Rich Violet | `#7C5295` | Secondary accent |
| Teal | `#3B7A6A` | Secondary accent, logo stem |
| Pastel tints | pink, lavender, mint, yellow, peach, blue | Card and icon backgrounds |
| Text | `#2D2426` / `#5C4F52` | Headings and body copy |

Fredoka (rounded, friendly) is used for headings and numerals; Outfit for body and interface text. Both are self-hosted variable WOFF2 files, so there is no request to a font service.

Two colour adjustments were made:

- Footer text was lightened (`#C4B6BA`, `#B5A7AB`) because the original grey was hard to read on the dark footer.
- Form errors use a red (`#A4262C`) that is different from the rose focus ring, so a focused field and an invalid field never look the same.

## 3. Page structure

The single page already had sections called Services, About and Contact, so the split followed them:

- **Home** keeps the landing page as it was: hero, craft categories, services preview, custom order banner, a short introduction and "Why handmade". The long order form moved out to its own page.
- **About** grows the original two-paragraph story into story, mission and vision, values and team.
- **Services** grows the four original service cards into six detailed ones, and adds the order process.
- **Contact** holds the original custom order form, now with full validation, beside the studio details.

Each inner page opens with a shorter version of the hero and ends with a call to action leading to Contact.

**Team section.** The original site describes a studio "founded by a maker", so the team section says so directly: one maker and her three craft desks. No named employees, client counts or achievements were invented.

**Services.** The four original services are kept word for word. The two added ones (Occasion & Event Sets, Personalised Keepsakes) come from things the original page already offered: special occasion themes, named keychains and mini paintings.

## 4. Responsive breakpoints

The original stylesheet used `max-width` queries at 992, 768, 480 and 360px. Those were kept. Everything added for the new pages is mobile-first: one column by default, with `min-width` queries at 640, 768 and 1024px adding columns.

Card grids use fixed column counts (1, 2, then 3 or 4) instead of `auto-fit`. With four or six cards, `auto-fit` left a single card alone on the last row at tablet widths.

Fixes for small screens found while testing:

- Below 480px the header button is hidden, because the logo, button and hamburger did not fit on one line.
- Below 480px long button labels may wrap instead of being cut off.
- The form and banner cards use less inner padding on phones, to keep a readable text width.

## 5. Navigation

- The same header markup is used on all four pages.
- The current page is marked in the HTML with `is-active` and `aria-current="page"`, so it works without JavaScript. The old scroll-position highlighting was removed because the links now lead to pages, not sections.
- At 768px and below the links collapse into a panel opened by a hamburger button with `aria-label`, `aria-controls` and `aria-expanded`.
- The menu closes on Escape (focus returns to the button), on an outside tap, on choosing a link, and when the window grows back to desktop width.
- Menu links are full-width rows about 46px tall on mobile.

## 6. Form validation

- HTML5 attributes describe the rules; JavaScript shows the messages. The form has `novalidate` so the browser's own bubbles do not appear on top of the custom messages.
- Each field has its own error line, linked with `aria-describedby`. Invalid fields are marked `aria-invalid`.
- Fields are checked on blur and re-checked while being corrected. On submit, focus moves to the first invalid field.
- The error line keeps its height when empty. Otherwise an error appearing as you leave a field pushes the Send button down, and the click on it is lost.
- The success message is truthful: it says the form is a demo and nothing was sent. There is no fake "sending" delay.
- Craft links such as `contact.html?craft=clay` preselect the craft. Unknown values are ignored.

## 7. Accessibility

- One `h1` per page, landmarks, and a skip link.
- Decorative SVGs and emoji are hidden from assistive technology; real images have descriptive alt text.
- Focus outlines are visible on every interactive element.
- Tap targets are at least 40px tall at tablet width and below.
- Under `prefers-reduced-motion`, animation, transitions and smooth scrolling are switched off.
- Scroll reveal only hides content when JavaScript is running (a `js` class is set in the page head). Without JavaScript the content is simply visible.
- The reveal now triggers as soon as a section enters the screen. The earlier 15% threshold could never be met by a section much taller than a small phone screen, which left it invisible.

## 8. Performance

- No framework, library, icon font or external request: one CSS file, one deferred script, two font files.
- Images are WebP with `width` and `height` set, so the layout does not jump as they load.
- Images below the fold use `loading="lazy"`; the three hero photographs load eagerly.
- Icons are inline SVG, so they cost no extra requests.
