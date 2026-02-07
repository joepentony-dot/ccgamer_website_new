export const ADMIN_BUILD_ID = '20260207-01';

if (typeof window !== 'undefined') {
  window.CCG_ADMIN_BUILD_ID = ADMIN_BUILD_ID;
  window.CCG_ADMIN_BUILD_QUERY = `v=${ADMIN_BUILD_ID}`;
}
