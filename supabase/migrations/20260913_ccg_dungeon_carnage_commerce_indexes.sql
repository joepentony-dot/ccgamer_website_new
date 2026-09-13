create index if not exists ccg_product_entitlements_product_slug_idx on public.ccg_product_entitlements(product_slug);
create index if not exists ccg_checkout_sessions_product_slug_idx on public.ccg_checkout_sessions(product_slug);
create index if not exists ccg_download_audit_user_id_idx on public.ccg_download_audit(user_id);
create index if not exists ccg_download_audit_product_slug_idx on public.ccg_download_audit(product_slug);
