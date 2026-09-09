/**
 * Kares Studio — Homepage CMS field registry.
 * Developer-defined fields ONLY (no page builder, no layout controls).
 * Each field maps to homepage_content (section, key) with either a
 * text value or an image_url object path.
 */

export type CmsFieldType = 'text' | 'textarea' | 'image';

export interface CmsField {
  section: string;
  key: string;
  label: string;
  type: CmsFieldType;
  hint?: string;
}

export interface CmsSection {
  id: string;
  title: string;
  description: string;
  fields: CmsField[];
}

export const CMS_SECTIONS: CmsSection[] = [
  {
    id: 'hero',
    title: 'Hero',
    description: 'Tulisan dan foto utama homepage. Gunakan | untuk baris baru heading.',
    fields: [
      { section: 'hero', key: 'eyebrow', label: 'Eyebrow', type: 'text' },
      { section: 'hero', key: 'heading', label: 'Heading (| = baris baru)', type: 'text' },
      { section: 'hero', key: 'description', label: 'Description', type: 'textarea' },
      { section: 'hero', key: 'button_text', label: 'Button Text', type: 'text' },
      { section: 'hero', key: 'image', label: 'Hero Image', type: 'image', hint: 'Object path Storage / URL / path lokal' },
      { section: 'hero', key: 'tagline', label: 'Tagline', type: 'text' },
    ],
  },
  {
    id: 'brand_statement',
    title: 'Brand Statement',
    description: 'Heading dan kutipan brand.',
    fields: [
      { section: 'brand_statement', key: 'heading', label: 'Heading', type: 'text' },
      { section: 'brand_statement', key: 'right_label', label: 'Right Label', type: 'text' },
      { section: 'brand_statement', key: 'badge', label: 'Badge', type: 'text' },
      { section: 'brand_statement', key: 'quote', label: 'Quote', type: 'textarea' },
      { section: 'brand_statement', key: 'image_left', label: 'Image Left', type: 'image', hint: 'Object path Storage (cms/...) / URL' },
      { section: 'brand_statement', key: 'image_right', label: 'Image Right', type: 'image', hint: 'Object path Storage (cms/...) / URL' },
    ],
  },
  {
    id: 'categories',
    title: 'Categories',
    description: 'Label section kategori (daftar kategori dari data Category).',
    fields: [{ section: 'categories', key: 'tag', label: 'Section Tag', type: 'text' }],
  },
  {
    id: 'featured',
    title: 'Featured Collection',
    description: 'Heading section koleksi unggulan (produk dari flag Featured).',
    fields: [
      { section: 'featured', key: 'tag', label: 'Tag', type: 'text' },
      { section: 'featured', key: 'heading', label: 'Heading', type: 'text' },
      { section: 'featured', key: 'sub', label: 'Supporting Text', type: 'text' },
    ],
  },
  {
    id: 'quality',
    title: 'Quality / Testimonial',
    description: 'Kutipan kualitas dan foto pendukung.',
    fields: [
      { section: 'quality', key: 'tag', label: 'Tag', type: 'text' },
      { section: 'quality', key: 'quote', label: 'Quote', type: 'textarea' },
      { section: 'quality', key: 'image', label: 'Image', type: 'image' },
    ],
  },
  {
    id: 'manifesto',
    title: 'Manifesto',
    description: 'Teks manifesto (teks polos, tanpa dekorasi manual).',
    fields: [{ section: 'manifesto', key: 'heading', label: 'Heading', type: 'textarea' }],
  },
  {
    id: 'assistance',
    title: 'Assistance',
    description: 'Label bantuan, CTA, dan 2 foto section (daftar koleksi dari data statis).',
    fields: [
      { section: 'assistance', key: 'tag', label: 'Topbar Tag', type: 'text' },
      { section: 'assistance', key: 'description', label: 'Description', type: 'textarea' },
      { section: 'assistance', key: 'button_text', label: 'Button Text', type: 'text' },
      { section: 'assistance', key: 'image_1', label: 'Assistance Image 1', type: 'image', hint: 'Object path Storage (static/assistance/...) / URL' },
      { section: 'assistance', key: 'image_2', label: 'Assistance Image 2', type: 'image', hint: 'Object path Storage (static/assistance/...) / URL' },
    ],
  },
  {
    id: 'about',
    title: 'About Page',
    description: 'Foto halaman About (teks About tetap statis).',
    fields: [
      { section: 'about', key: 'image', label: 'About Image', type: 'image', hint: 'Object path Storage (static/about/...) / URL' },
    ],
  },
  {
    id: 'contact',
    title: 'Contact Page',
    description: 'Foto halaman Contact (teks Contact tetap statis).',
    fields: [
      { section: 'contact', key: 'image', label: 'Contact Image', type: 'image', hint: 'Object path Storage (static/contact/...) / URL' },
    ],
  },
  {
    id: 'footer',
    title: 'Footer',
    description: 'Teks footer dan alamat.',
    fields: [
      { section: 'footer', key: 'tagline', label: 'Tagline', type: 'textarea' },
      { section: 'footer', key: 'address', label: 'Address', type: 'text' },
    ],
  },
];
