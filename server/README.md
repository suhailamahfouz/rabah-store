# RABAH API

## Storefront catalog and checkout

Before enabling checkout on an existing database, run `npm run sync-catalog` from
the `server` directory. This safely upserts the storefront categories and
products without deleting orders or resetting existing product stock. Checkout
uses these product slugs to create orders, and the customer sees the order
number returned by the API on the confirmation page. The storefront currently
accepts cash on delivery only.

## Admin dashboard

### Cloudinary image storage

All dashboard images (products, categories, logo, hero, and banner assets) are
uploaded through the protected API to Cloudinary. Add these three values to the
server environment before starting the API; they must be supplied together and
must never be exposed in the Angular client:

```powershell
$env:CLOUDINARY_CLOUD_NAME = "your-cloud-name"
$env:CLOUDINARY_API_KEY = "your-api-key"
$env:CLOUDINARY_API_SECRET = "your-api-secret"
```

The dashboard sends the device file to the API, receives only the resulting
asset URL and public id, and stores those references in MongoDB. Replacing or
removing a saved image deletes the old Cloudinary asset only after MongoDB has
successfully saved the new record.

Create the first admin account from the `server` directory by providing credentials through environment variables (the password must be 12-72 characters):

```powershell
$env:ADMIN_EMAIL = "admin@example.com"
$env:ADMIN_USERNAME = "store-admin"
$env:ADMIN_NAME = "Store Admin"
$env:ADMIN_PASSWORD = "use-a-unique-password"
npm run create-admin
```

The command refuses to overwrite an existing admin account. Start the API and client, open `/admin/login`, and sign in with these credentials. Successful sign-in opens the protected `/admin` dashboard.

Products marked as demo are hidden from the public catalog and checkout. Add products from the admin dashboard; newly created active products are served by the backend catalog API and appear in the storefront.

## SEO endpoints

Set `SITE_URL` to the canonical public storefront origin when deploying (for example, `https://store.example.com`). The API then creates a fresh sitemap from active categories and non-demo active products at `/sitemap.xml` (also available as `/api/sitemap.xml` for a static-client/API proxy) and exposes `/robots.txt`. The client has a fallback `robots.txt` pointing at `/api/sitemap.xml`; in production, proxy `/sitemap.xml` and `/robots.txt` to the API if the Angular app is served separately.

The dashboard supports creating and editing products and categories, hiding
items from the storefront, reviewing recent orders and customer/shipping
details, changing order and payment statuses, and updating store branding,
delivery fees, free-shipping threshold, announcement, contact details, and
social links. Order and payment changes and all management endpoints require
an authenticated admin session. Product/category records are hidden rather
than hard-deleted; a category with assigned products cannot be hidden. The
dashboard lists up to the latest 200 orders.

The storefront reads active products and categories from the public catalog
API, so admin catalog edits appear in the store after they are saved. If the
API is unavailable, the client retains its bundled sample catalog and displays
a warning rather than silently treating that data as current.

Delivery fees and the free-shipping threshold are read from store settings by
the checkout API. The browser's order request cannot override the shipping
amount or currency.

To reset the password for an existing admin account, set `ADMIN_EMAIL` and a new 12-72 character `ADMIN_PASSWORD`, then run `npm run reset-admin-password` from Command Prompt:

```cmd
set "ADMIN_EMAIL=admin@example.com"
set "ADMIN_PASSWORD=choose-a-new-unique-password"
npm run reset-admin-password
```

The reset command only updates the password for the specified existing admin; it does not create an account.

## Security migration after this update

Before deploying this update against an existing database, run the following once from the `server` directory. It replaces only the legacy order idempotency index; it does not alter orders or customer data.

```powershell
npm run migrate:order-idempotency-index
```

## Legacy color/size inventory migration

Legacy products whose variants contain both `color` and `size` can be converted
to one inventory record per color. The migration is a standalone command and is
never run by the API, seed, or catalog sync. It is a dry run by default:

```powershell
npm run migrate:color-inventory
```

It writes a JSON preflight report under `server/migration-reports/` and lists
the old/new variant counts, stock totals, merged colors, and warnings. Review
that report before applying changes. To apply it explicitly:

```powershell
npm run migrate:color-inventory -- --apply --report=./migration-reports/color-inventory-apply.json
```

The command preserves the first variant id for each color, sums all source
stocks, sets the product aggregate stock to that sum, and updates no orders.
Each write is guarded by the exact preflight variant array; if an order or
admin changes the product between the report and the write, that product is
reported as a conflict instead of being overwritten. A second run is a no-op.
Production apply runs are blocked unless `--allow-production` is supplied
explicitly after a backup and maintenance window:

```powershell
npm run migrate:color-inventory -- --apply --allow-production
```

Rollback is safest by restoring the affected `products` documents from the
database backup taken before applying the report. The JSON report is a
pre-change audit record, not a complete backup. Historical orders are not
modified; if an old order references a merged size variant, cancellation uses
its stored color snapshot to restore the color stock.
