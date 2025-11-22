import {
  type ProductAvailability,
  type ProductData,
  type ProductVariant,
} from '../types';

const AVAILABILITY_LABELS: Record<ProductAvailability, string> = {
  'in-stock': 'In stock',
  preorder: 'Preorder',
  backorder: 'Backorder',
  'sold-out': 'Sold out',
  discontinued: 'Discontinued',
};

export const PRODUCT_AVAILABILITY_OPTIONS: ProductAvailability[] = [
  'in-stock',
  'preorder',
  'backorder',
  'sold-out',
  'discontinued',
];

const coerceString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const normalizeAvailability = (value: unknown): ProductAvailability | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  const match = PRODUCT_AVAILABILITY_OPTIONS.find((option) => option === normalized);

  return match ?? undefined;
};

const createVariantId = (timestamp: number, index: number): string =>
  `product-${timestamp.toString(36)}-${index.toString(36)}`;

const sanitizeVariant = (
  value: unknown,
  timestamp: number,
  index: number,
): ProductVariant | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Partial<ProductVariant> & Record<string, unknown>;
  const name = coerceString(raw.name).trim();
  const price = coerceString(raw.price).trim();
  const sku = coerceString(raw.sku).trim();
  const url = coerceString(raw.url).trim();
  const notes = coerceString(raw.notes).trim();
  const availability = normalizeAvailability(raw.availability);
  const rawId = coerceString(raw.id).trim();
  const id = rawId.length > 0 ? rawId : createVariantId(timestamp, index);

  if (
    name.length === 0 &&
    price.length === 0 &&
    sku.length === 0 &&
    url.length === 0 &&
    notes.length === 0
  ) {
    return null;
  }

  return {
    id,
    name: name.length > 0 ? name : `Product ${index + 1}`,
    price: price.length > 0 ? price : undefined,
    sku: sku.length > 0 ? sku : undefined,
    url: url.length > 0 ? url : undefined,
    notes: notes.length > 0 ? notes : undefined,
    availability,
  } satisfies ProductVariant;
};

export const sanitizeProductData = (
  value: unknown,
  artifactTitle?: string,
): ProductData => {
  const timestamp = Date.now();
  const source =
    value && typeof value === 'object'
      ? (value as Partial<ProductData> & Record<string, unknown>)
      : ({} as Partial<ProductData> & Record<string, unknown>);

  const fallbackDescription = artifactTitle
    ? `Merchandise lineup for ${artifactTitle}.`
    : 'Track merchandise, pricing, and availability in one place.';

  const description = coerceString(source.description).trim();
  const vendor = coerceString(source.vendor).trim();
  const fulfillmentNotes = coerceString(source.fulfillmentNotes).trim();
  const variantsSource = Array.isArray(source.variants) ? source.variants : [];

  const variants = variantsSource
    .map((variant, index) => sanitizeVariant(variant, timestamp, index))
    .filter((variant): variant is ProductVariant => variant !== null);

  return {
    description: description.length > 0 ? description : fallbackDescription,
    vendor: vendor.length > 0 ? vendor : '',
    fulfillmentNotes: fulfillmentNotes.length > 0 ? fulfillmentNotes : '',
    variants,
  } satisfies ProductData;
};

export const createDefaultProductData = (title?: string): ProductData => ({
  description: title?.trim().length
    ? `Merchandise lineup for ${title}.`
    : 'Track merchandise, pricing, and availability in one place.',
  vendor: '',
  fulfillmentNotes: '',
  variants: [],
});

export const formatProductAvailability = (
  availability?: ProductAvailability,
): string => {
  if (!availability) {
    return 'Unspecified';
  }

  return AVAILABILITY_LABELS[availability] ?? 'Unspecified';
};
