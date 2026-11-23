# Prompts I reuse

## 1 · A drawing for a new project

Paste this into Claude. Replace the two lines in [brackets].

```
Make a line drawing for my portfolio project card.

Project: [name, and one line on what it does]
GitHub: [https://github.com/pankqx/REPO]

Read the repo's README first so the drawing shows what the app really does.

Rules (my site already has the CSS for these, so follow them exactly):
- Output ONE inline <svg> only, no <style>, no <script>, no images, no external files.
- Start with: <svg class="art dw" viewBox="0 0 400 250" role="img" aria-label="(one sentence describing the drawing)">
- Draw only outlines, like a technical sketch. Classes to use:
  class="ln d"   main lines (they draw themselves in)
  class="lt d"   thin, faint inner lines
  class="ln d hl" the ONE orange highlight line (use 1 or 2 times max)
  class="f"      things that fade in after the lines (small dots, labels)
  class="sf"     small orange filled dot (max 2)
  class="tx"     tiny uppercase mono label text (max 3 labels)
- Put pathLength="1" on every element that has class "d".
- Stagger with style="--d:.3s", "--d:.5s" and so on, up to about 1.2s.
- No fills except the classes above. No gradients, no shadows, no colours written in hex.
- Keep it simple: 15 to 30 shapes. Leave white space around the edges.
- Show the product in use (a phone, a laptop, a screen, a flow), not a logo.

Give me the <svg> in one code block and nothing else.
```

Then in `index.html`, find the project card (search for its name), and replace its old `<svg class="art dw" ...> ... </svg>` with the new one.
