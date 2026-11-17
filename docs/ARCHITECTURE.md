# RABAH — Architecture & Implementation Plan

## Independence rule
The store owns its own MongoDB database. There is **no** integration with any POS / shop system.
Online stock is edited manually by the admin. No accounting, staff, or shift features exist.

## Stack (verified compatible, Node 22)
| Layer | Choice | Reason |
|---|---|---|
| Frontend | Angular 22, standalone components, signals, SCSS | Current stable; lazy routes via `loadComponent` |
| Backend | Express 5 + TypeScript 6 | Express 5 handles async errors natively |
| DB | MongoDB Atlas + Mongoose 9 | As specified |
| Validation | Zod 4 | One schema = types + runtime validation |
| Auth | JWT in HttpOnly + SameSite cookie, bcrypt (cost 12) | No token in JS-readable storage |
| Storefront image uploads | multer memory storage -> magic-byte check -> Cloudinary | Never trust client MIME; Cloudinary credentials stay server-side |
| Hardening | helmet, express-rate-limit, CORS allow-list, custom NoSQL-operator stripper | `express-mongo-sanitize` is not Express 5-safe |

## Key decisions
1. **Server is the source of truth for money.** Orders are priced from DB; client prices are ignored.
2. **Atomic stock decrement** with `findOneAndUpdate({stock: {$gte: qty}})` — prevents overselling without transactions.
3. **Idempotency key** on order creation blocks double submit.
4. **Bilingual content** stored as `{ ar, en }` on documents; UI strings via a lightweight signal-based i18n service (no heavy library; RTL via `dir` on `<html>`).
5. **Arabic default**, language persisted in localStorage and mirrored in the `lang` attribute.
6. **Hero video** URL + poster + optional mobile video come from Settings; poster renders first, video lazy-attaches after load.
7. **SPA first, SSR later.** Meta/OG tags are set per route now; Angular SSR is the documented upgrade if social-preview crawling of product pages matters.
8. **Payments:** COD and manual InstaPay only. Proof uploads leave payment `awaiting_verification`; only an admin can mark `paid`.

## Folder layout
```
rabah-store/
  client/  (Angular: core/ shared/ layout/ features/{home,catalog,product,cart,checkout,orders,auth,admin})
  server/  src/{config,models,controllers,routes,middleware,services,validators,utils,seed}
  docs/
```

## Checklist
- [x] P1 Repo inspection, scaffold both apps, architecture
- [ ] P1 Server foundation (env, db, errors, security middleware, models)
- [ ] P2 Design system, i18n/RTL, header + mobile drawer, home, cards, catalog, product page
- [ ] P3 Routes/controllers/validators, auth, seed (labelled DEMO data)
- [ ] P4 Cart, checkout, COD, InstaPay manual, orders, stock
- [ ] P5 Admin: login, products, categories, orders, settings
- [ ] P6 Testing, README, API docs, deployment guide
