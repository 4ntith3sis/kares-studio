export function formatIDR(price: number): string {
  return 'Rp ' + Math.round(price).toLocaleString('id-ID');
}
