import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  type AddRelationHandler,
  type Artifact,
  type ProductData,
  type ProductVariant,
  type Relation,
} from '../types';
import {
  BuildingStorefrontIcon,
  LinkIcon,
  PlusIcon,
  TrashIcon,
} from './Icons';
import {
  formatProductAvailability,
  PRODUCT_AVAILABILITY_OPTIONS,
  sanitizeProductData,
} from '../utils/product';

interface ProductEditorProps {
  artifact: Artifact;
  projectArtifacts: Artifact[];
  onUpdateArtifactData: (artifactId: string, data: ProductData) => void;
  onAddRelation: AddRelationHandler;
  onRemoveRelation: (fromId: string, relationIndex: number) => void;
}

const createVariantId = (existing: ProductVariant[]): string => {
  const timestamp = Date.now().toString(36);
  const counter = (existing.length + 1).toString(36);
  return `product-${timestamp}-${counter}`;
};

const RELATION_OPTIONS = ['DERIVES_FROM', 'RELATES_TO', 'APPEARS_IN', 'INSPIRES'];

const ProductEditor: React.FC<ProductEditorProps> = ({
  artifact,
  projectArtifacts,
  onUpdateArtifactData,
  onAddRelation,
  onRemoveRelation,
}) => {
  const [productData, setProductData] = useState<ProductData>(() =>
    sanitizeProductData(artifact.data, artifact.title),
  );
  const [variantRelationTargets, setVariantRelationTargets] = useState<Record<string, string>>({});
  const [variantRelationKinds, setVariantRelationKinds] = useState<Record<string, string>>({});

  const lastArtifactIdRef = useRef<string>(artifact.id);

  useEffect(() => {
    if (artifact.id === lastArtifactIdRef.current) {
      return;
    }

    lastArtifactIdRef.current = artifact.id;
    setProductData(sanitizeProductData(artifact.data, artifact.title));
    setVariantRelationTargets({});
    setVariantRelationKinds({});
  }, [artifact.data, artifact.id, artifact.title]);

  const persistData = (nextData: ProductData) => {
    setProductData(nextData);
    onUpdateArtifactData(artifact.id, nextData);
  };

  const handleFieldChange = <K extends keyof ProductData>(key: K, value: ProductData[K]) => {
    const sanitizedValue = typeof value === 'string' ? value : value;
    persistData({ ...productData, [key]: sanitizedValue } as ProductData);
  };

  const handleVariantChange = <K extends keyof ProductVariant>(
    variantId: string,
    key: K,
    value: ProductVariant[K],
  ) => {
    const variants = productData.variants.map((variant) => {
      if (variant.id !== variantId) {
        return variant;
      }

      if (key === 'price' || key === 'sku' || key === 'url' || key === 'notes' || key === 'name') {
        const normalized = typeof value === 'string' ? value : '';
        const hasContent = typeof value === 'string' ? value.trim().length > 0 : true;
        return {
          ...variant,
          [key]: hasContent ? normalized : undefined,
        } satisfies ProductVariant;
      }

      return { ...variant, [key]: value } satisfies ProductVariant;
    });

    persistData({ ...productData, variants });
  };

  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      id: createVariantId(productData.variants),
      name: `Merch Item ${productData.variants.length + 1}`,
      availability: 'in-stock',
    };

    persistData({ ...productData, variants: [...productData.variants, newVariant] });
  };

  const handleRemoveVariant = (variantId: string) => {
    const relationsToRemove = artifactRelations
      .map((relation, index) => ({ relation, index }))
      .filter(({ relation }) => relation.variantId === variantId)
      .map(({ index }) => index)
      .sort((a, b) => b - a);

    relationsToRemove.forEach((relationIndex) => {
      onRemoveRelation(artifact.id, relationIndex);
    });

    persistData({
      ...productData,
      variants: productData.variants.filter((variant) => variant.id !== variantId),
    });
  };

  const artifactRelations = useMemo<Relation[]>(() => artifact.relations ?? [], [artifact.relations]);

  const handleVariantRelationKindChange = (variantId: string, value: string) => {
    setVariantRelationKinds((current) => ({ ...current, [variantId]: value }));
  };

  const handleVariantRelationTargetChange = (variantId: string, targetId: string) => {
    setVariantRelationTargets((current) => ({ ...current, [variantId]: targetId }));
  };

  const handleLinkVariant = (variant: ProductVariant) => {
    const targetId = (variantRelationTargets[variant.id] ?? '').trim();
    const relationKind = (variantRelationKinds[variant.id] ?? 'DERIVES_FROM').trim();

    if (targetId.length === 0) {
      return;
    }

    onAddRelation(artifact.id, targetId, relationKind.length > 0 ? relationKind : 'RELATES_TO', {
      variantId: variant.id,
    });

    setVariantRelationTargets((current) => ({ ...current, [variant.id]: '' }));
  };

  const hasVariants = productData.variants.length > 0;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-cyan-300">
          <BuildingStorefrontIcon className="h-6 w-6" />
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Artifact Type</p>
            <h3 className="text-lg font-bold">Product Catalog</h3>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="rounded-full bg-slate-800/80 px-3 py-1 font-semibold uppercase tracking-wide">Merchandise</span>
          <span className="rounded-full bg-slate-800/80 px-3 py-1 font-semibold uppercase tracking-wide">
            {productData.variants.length} {productData.variants.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-2">
            <label htmlFor="product-description" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Merchandise Overview
            </label>
            <textarea
              id="product-description"
              value={productData.description}
              onChange={(event) => handleFieldChange('description', event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 shadow-inner focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              placeholder="What merch exists for this project? List themes, bundles, or drop cadence."
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="product-vendor" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Vendor or fulfillment partner
              </label>
              <input
                id="product-vendor"
                type="text"
                value={productData.vendor ?? ''}
                onChange={(event) => handleFieldChange('vendor', event.target.value)}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                placeholder="e.g., Printful, Gumroad, in-house shop"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="product-fulfillment-notes"
                className="text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Fulfillment notes
              </label>
              <input
                id="product-fulfillment-notes"
                type="text"
                value={productData.fulfillmentNotes ?? ''}
                onChange={(event) => handleFieldChange('fulfillmentNotes', event.target.value)}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                placeholder="Shipping windows, packaging, or pre-order timelines"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-700/60 bg-slate-950/50 p-4">
          <p className="text-sm font-semibold text-slate-200">Share this catalog</p>
          <p className="text-xs text-slate-400">
            Link merch items to drops, launch days, or related artifacts so collaborators can find everything in one place.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <LinkIcon className="h-4 w-4" />
            {artifact.relations.length > 0
              ? 'Relations already connect this catalog or specific items to the wider project.'
              : 'Add relations to connect catalog entries and individual products to scenes, characters, or campaigns.'}
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-white">Merchandise lineup</h4>
            <p className="text-sm text-slate-400">Track SKUs, availability, and storefront links for every product.</p>
          </div>
          <button
            type="button"
            onClick={handleAddVariant}
            className="inline-flex items-center gap-2 rounded-md border border-cyan-500/60 bg-cyan-600/20 px-3 py-2 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-400 hover:bg-cyan-500/30"
          >
            <PlusIcon className="h-4 w-4" />
            Add merch item
          </button>
        </div>

        {hasVariants ? (
          <div className="space-y-4">
            {productData.variants.map((variant) => {
              const priceInputId = `product-price-${variant.id}`;
              const skuInputId = `product-sku-${variant.id}`;
              const availabilityInputId = `product-availability-${variant.id}`;
              const urlInputId = `product-url-${variant.id}`;
              const notesInputId = `product-notes-${variant.id}`;
              const variantRelationEntries = artifactRelations
                .map((relation, index) => ({ relation, index }))
                .filter(({ relation }) => relation.variantId === variant.id);
              const availableVariantTargets = projectArtifacts.filter(
                (candidate) =>
                  candidate.id !== artifact.id &&
                  !variantRelationEntries.some(({ relation }) => relation.toId === candidate.id),
              );
              const selectedVariantRelationKind = variantRelationKinds[variant.id] ?? 'DERIVES_FROM';
              const selectedVariantRelationTarget = variantRelationTargets[variant.id] ?? '';

              return (
                <div
                  key={variant.id}
                  className="space-y-4 rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 shadow-sm shadow-black/20"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={variant.name ?? ''}
                        onChange={(event) => handleVariantChange(variant.id, 'name', event.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="Product name or bundle title"
                      />
                      <p className="text-xs text-slate-500">Include edition names or bundle notes to avoid confusion.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(variant.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 px-3 py-2 text-xs font-semibold text-rose-200 transition-colors hover:border-rose-400 hover:bg-rose-500/10"
                    >
                      <TrashIcon className="h-4 w-4" />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <label
                        className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                        htmlFor={priceInputId}
                      >
                        Price
                      </label>
                      <input
                        id={priceInputId}
                        type="text"
                        value={variant.price ?? ''}
                        onChange={(event) => handleVariantChange(variant.id, 'price', event.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="$25.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                        htmlFor={skuInputId}
                      >
                        SKU
                      </label>
                      <input
                        id={skuInputId}
                        type="text"
                        value={variant.sku ?? ''}
                        onChange={(event) => handleVariantChange(variant.id, 'sku', event.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="SKU-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                        htmlFor={availabilityInputId}
                      >
                        Availability
                      </label>
                      <select
                        id={availabilityInputId}
                        value={variant.availability ?? ''}
                        onChange={(event) =>
                          handleVariantChange(variant.id, 'availability', event.target.value || undefined)
                        }
                        className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      >
                        <option value="">Unspecified</option>
                        {PRODUCT_AVAILABILITY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {formatProductAvailability(option)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                        htmlFor={urlInputId}
                      >
                        Storefront URL
                      </label>
                      <input
                        id={urlInputId}
                        type="url"
                        value={variant.url ?? ''}
                        onChange={(event) => handleVariantChange(variant.id, 'url', event.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="https://shop.example.com/products/hero-poster"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-xs font-semibold uppercase tracking-wide text-slate-400"
                        htmlFor={notesInputId}
                      >
                        Notes
                      </label>
                      <input
                        id={notesInputId}
                        type="text"
                        value={variant.notes ?? ''}
                        onChange={(event) => handleVariantChange(variant.id, 'notes', event.target.value)}
                        className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                        placeholder="Drop timing, bundle contents, or limited-run details"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-emerald-100">Lineup relations</p>
                        <p className="text-xs text-emerald-200/80">
                          Link this merch item to characters, scenes, or drops in the project.
                        </p>
                      </div>
                    </div>

                    {variantRelationEntries.length > 0 ? (
                      <div className="space-y-2">
                        {variantRelationEntries.map(({ relation, index }) => {
                          const target = projectArtifacts.find((item) => item.id === relation.toId);
                          return (
                            <div
                              key={`${relation.toId}-${relation.kind}-${index}`}
                              className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-50"
                            >
                              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                                {relation.kind}
                              </span>
                              <span className="font-semibold">
                                {target?.title ?? relation.toId}
                              </span>
                              <button
                                type="button"
                                onClick={() => onRemoveRelation(artifact.id, index)}
                                className="ml-auto text-emerald-200 transition hover:text-rose-200"
                              >
                                <TrashIcon className="h-4 w-4" />
                                <span className="sr-only">Remove relation</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-200/80">
                        No relations yet. Tie this item back to its inspiration to keep the catalog traceable.
                      </p>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={selectedVariantRelationKind}
                        onChange={(event) =>
                          handleVariantRelationKindChange(variant.id, event.target.value)
                        }
                        className="w-full rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-50 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      >
                        {RELATION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedVariantRelationTarget}
                        onChange={(event) =>
                          handleVariantRelationTargetChange(variant.id, event.target.value)
                        }
                        className="w-full rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-50 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      >
                        <option value="">Select an artifact to link</option>
                        {availableVariantTargets.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.title} ({candidate.type})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleLinkVariant(variant)}
                        className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-50 transition-colors hover:border-emerald-300 hover:bg-emerald-500/30"
                      >
                        <LinkIcon className="h-4 w-4" />
                        Link item
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-700/70 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
            No merch items added yet. Start with a flagship product or bundle to anchor the catalog.
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductEditor;
