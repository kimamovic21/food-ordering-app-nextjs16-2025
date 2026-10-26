'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';
import { useRouter, useParams } from 'next/navigation';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw } from 'lucide-react';
import { getMenuItemStockEdit } from '@/libs/menuItemEdit';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import useProfile from '@/hooks/useProfile';
import Title from '@/components/shared/Title';
import MenuItemImage from '../../MenuItemImage';
import MenuItemForm from '../../MenuItemForm';
import { AI_MENU_DESCRIPTION_MAX_CHARS } from '@/libs/menuItemDescription';
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_MENU_ITEM_STOCK_QUANTITY,
  MAX_LOW_STOCK_THRESHOLD,
  MAX_MENU_ITEM_STOCK_QUANTITY,
} from '@/libs/menuItemInventory';
import {
  DEFAULT_MENU_ITEM_QUANTITY_LIMIT,
  MAX_MENU_ITEM_QUANTITY_LIMIT,
  MIN_MENU_ITEM_QUANTITY_LIMIT,
} from '@/libs/orderQuantityLimits';
import type { MenuItemCategory, MenuItemListItem } from '@/types/menu';

const EditMenuItemPage = () => {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const form = useForm();
  const { data, loading } = useProfile();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [priceType, setPriceType] = useState('single');
  const [priceSmall, setPriceSmall] = useState('');
  const [priceMedium, setPriceMedium] = useState('');
  const [priceLarge, setPriceLarge] = useState('');
  const [maxQuantityPerOrder, setMaxQuantityPerOrder] = useState(
    String(DEFAULT_MENU_ITEM_QUANTITY_LIMIT)
  );
  const [trackInventory, setTrackInventory] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(String(DEFAULT_MENU_ITEM_STOCK_QUANTITY));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(DEFAULT_LOW_STOCK_THRESHOLD));
  const [isAvailable, setIsAvailable] = useState(true);
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [categories, setCategories] = useState<MenuItemCategory[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDescriptionGenerating, setIsDescriptionGenerating] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [baseline, setBaseline] = useState<MenuItemListItem | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [confirmReload, setConfirmReload] = useState(false);
  const savingRef = useRef(false);

  const applyItem = useCallback((item: MenuItemListItem) => {
    setBaseline(item);
    setName(item.name);
    setDescription(item.description);
    setCategoryId(typeof item.category === 'string' ? item.category : item.category?._id || '');
    setPriceType(
      item.priceType ||
        (item.foodType === 'drink'
          ? 'single'
          : item.priceLarge != null
            ? 'triple'
            : item.priceMedium != null
              ? 'double'
              : 'single')
    );
    setPriceSmall(item.priceSmall?.toString() ?? '');
    setPriceMedium(item.priceMedium?.toString() ?? '');
    setPriceLarge(item.priceLarge?.toString() ?? '');
    setMaxQuantityPerOrder(String(item.maxQuantityPerOrder ?? DEFAULT_MENU_ITEM_QUANTITY_LIMIT));
    setTrackInventory(item.trackInventory === true);
    setStockQuantity(
      String(item.stockQuantity ?? (item.trackInventory ? 0 : DEFAULT_MENU_ITEM_STOCK_QUANTITY))
    );
    setLowStockThreshold(String(item.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD));
    setIsAvailable(item.isAvailable !== false);
    setImage(item.image || '');
    setImagePreview(item.image || '');
    setImageFile(null);
    setConflict(null);
  }, []);

  const fetchCategoriesAndItem = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const [catsRes, itemRes] = await Promise.all([
        fetch('/api/categories'),
        fetch(`/api/menu-items?_id=${id}`, { cache: 'no-store' }),
      ]);

      if (!catsRes.ok || !itemRes.ok) throw new Error('Failed to load menu item');

      const cats = await catsRes.json();
      setCategories(cats);

      const items: MenuItemListItem[] = await itemRes.json();
      if (!items.length) throw new Error('Menu item not found');
      if (items.length > 0) {
        const item = items[0];

        // Check if the current user is the owner of this menu item
        if (data?._id && item.adminId && item.adminId !== data._id) {
          sonnerToast.error('You are not authorized to edit this menu item', {
            style: {
              background: '#ef4444',
              color: 'white',
            },
          });
          router.push('/admin-dashboard/menu-items');
          return;
        }

        applyItem(item);
        setLoadError(false);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      sonnerToast.error('Failed to load menu item');
      setLoadError(true);
    } finally {
      setIsDataLoading(false);
    }
  }, [id, data?._id, router, applyItem]);

  useEffect(() => {
    if (data?._id) {
      fetchCategoriesAndItem();
    }
  }, [data?._id, fetchCategoriesAndItem]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length !== 1) return;

    const file = files[0];
    setImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateDescription = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      sonnerToast.error('Add a menu item name first');
      return;
    }

    setIsDescriptionGenerating(true);

    try {
      const response = await fetch('/api/ai/menu-item-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || 'Failed to generate description');
      }

      if (typeof json.description !== 'string' || json.description.trim() === '') {
        throw new Error('AI returned an empty description');
      }

      setDescription(json.description.slice(0, AI_MENU_DESCRIPTION_MAX_CHARS));
      sonnerToast.success('Description generated', {
        style: {
          background: '#22c55e',
          color: 'white',
        },
      });
    } catch (error) {
      console.error('Error generating description:', error);
      sonnerToast.error(error instanceof Error ? error.message : 'Failed to generate description');
    } finally {
      setIsDescriptionGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || !baseline || conflict || isDescriptionGenerating) return;

    if (name.trim() === '' || categoryId.trim() === '') {
      sonnerToast.error('Name and category are required', {
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
      return;
    }

    const requiredPriceCount = priceType === 'single' ? 1 : priceType === 'double' ? 2 : 3;
    const hasEnoughPrices = [priceSmall.trim(), priceMedium.trim(), priceLarge.trim()]
      .slice(0, requiredPriceCount)
      .every((price) => price !== '');

    if (!hasEnoughPrices) {
      sonnerToast.error(
        `Please provide ${requiredPriceCount} price${requiredPriceCount > 1 ? 's' : ''}`,
        {
          style: {
            background: '#ef4444',
            color: 'white',
          },
        }
      );
      return;
    }

    savingRef.current = true;
    setIsSaving(true);

    try {
      const s = priceSmall.trim() ? Number(priceSmall) : null;
      const m = priceMedium.trim() ? Number(priceMedium) : null;
      const l = priceLarge.trim() ? Number(priceLarge) : null;
      const maxQuantity = Number(maxQuantityPerOrder);
      const stock = Number(stockQuantity);
      const lowStock = Number(lowStockThreshold);

      // Validate that all prices (if provided) are valid numbers
      if (
        (priceSmall.trim() && isNaN(s as number)) ||
        (priceMedium.trim() && isNaN(m as number)) ||
        (priceLarge.trim() && isNaN(l as number))
      ) {
        sonnerToast.error('All prices must be valid numbers', {
          style: {
            background: '#ef4444',
            color: 'white',
          },
        });
        setIsSaving(false);
        return;
      }

      if (
        !Number.isFinite(maxQuantity) ||
        maxQuantity < MIN_MENU_ITEM_QUANTITY_LIMIT ||
        maxQuantity > MAX_MENU_ITEM_QUANTITY_LIMIT
      ) {
        sonnerToast.error(
          `Max quantity per order must be between ${MIN_MENU_ITEM_QUANTITY_LIMIT} and ${MAX_MENU_ITEM_QUANTITY_LIMIT}`,
          {
            style: {
              background: '#ef4444',
              color: 'white',
            },
          }
        );
        setIsSaving(false);
        return;
      }

      if (
        trackInventory &&
        (!stockQuantity.trim() ||
          !Number.isInteger(stock) ||
          stock < 0 ||
          stock > MAX_MENU_ITEM_STOCK_QUANTITY)
      ) {
        sonnerToast.error(`Current stock must be between 0 and ${MAX_MENU_ITEM_STOCK_QUANTITY}`, {
          style: {
            background: '#ef4444',
            color: 'white',
          },
        });
        setIsSaving(false);
        return;
      }

      if (
        trackInventory &&
        (!lowStockThreshold.trim() ||
          !Number.isInteger(lowStock) ||
          lowStock < 0 ||
          lowStock > MAX_LOW_STOCK_THRESHOLD)
      ) {
        sonnerToast.error(`Low stock alert must be between 0 and ${MAX_LOW_STOCK_THRESHOLD}`, {
          style: {
            background: '#ef4444',
            color: 'white',
          },
        });
        setIsSaving(false);
        return;
      }

      const menuItemData = {
        name,
        description,
        category: categoryId,
        priceType,
        priceSmall: s,
        priceMedium: priceType === 'single' ? null : m,
        priceLarge: priceType === 'triple' ? l : null,
        maxQuantityPerOrder: Math.floor(maxQuantity),
        trackInventory,
        ...getMenuItemStockEdit(baseline, trackInventory, stock),
        expectedEditVersion: baseline.editVersion ?? 0,
        lowStockThreshold: Math.floor(lowStock),
        isAvailable,
        image: image || '',
      };

      const payload = JSON.stringify({ _id: id, ...menuItemData });
      const body = new FormData();
      body.append('data', payload);
      if (imageFile) body.append('file', imageFile);
      const response = await fetch('/api/menu-items', {
        method: 'PUT',
        ...(imageFile ? {} : { headers: { 'Content-Type': 'application/json' } }),
        body: imageFile ? body : payload,
      });

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409)
          setConflict(result.error || 'This item changed. Reload before saving.');
        throw new Error(result.error || 'Failed to update menu item');
      }

      sonnerToast.success('Menu item updated!', {
        style: {
          background: '#22c55e',
          color: 'white',
        },
      });
      applyItem(result as MenuItemListItem);
    } catch (err) {
      console.error(err);
      sonnerToast.error(err instanceof Error ? err.message : 'Failed to update menu item', {
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const showSkeleton = loading || isDataLoading;

  const handlePriceTypeChange = (value: string) => {
    setPriceType(value);
    if (value === 'single') {
      setPriceMedium('');
      setPriceLarge('');
    }
    if (value === 'double') {
      setPriceLarge('');
    }
  };

  if (!loading && data?.role !== 'admin') return 'Not an admin.';

  return (
    <section className='mt-8 pb-10'>
      {showSkeleton ? (
        <div className='space-y-6 max-w-3xl mx-auto'>
          <div className='space-y-3'>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
              <div className='h-4 w-24 bg-muted animate-pulse rounded-md' />
              <div className='h-4 w-3 bg-muted animate-pulse rounded-md' />
              <div className='h-4 w-24 bg-muted animate-pulse rounded-md' />
            </div>
            <div className='h-10 w-64 bg-muted animate-pulse rounded-md' />
          </div>

          <div className='flex flex-col md:flex-row items-start gap-6'>
            <div className='flex flex-col items-center gap-3 w-full md:w-1/2'>
              <div className='w-full aspect-square min-h-64 md:min-h-72 bg-muted animate-pulse rounded-xl' />
              <div className='h-9 w-18 bg-muted animate-pulse rounded-md' />
            </div>

            <div className='w-full space-y-4'>
              <div className='space-y-2'>
                <div className='h-4 w-56 bg-muted animate-pulse rounded-md' />
                <div className='h-10 w-full bg-muted animate-pulse rounded-md' />
              </div>
              <div className='space-y-2'>
                <div className='h-4 w-48 bg-muted animate-pulse rounded-md' />
                <div className='h-10 w-full bg-muted animate-pulse rounded-md' />
              </div>
              <div className='space-y-2'>
                <div className='h-4 w-52 bg-muted animate-pulse rounded-md' />
                <div className='h-32 w-full bg-muted animate-pulse rounded-md' />
              </div>
              <div className='space-y-2'>
                <div className='h-4 w-52 bg-muted animate-pulse rounded-md' />
                <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className='space-y-2'>
                      <div className='h-3 w-28 bg-muted animate-pulse rounded-md' />
                      <div className='h-10 w-full bg-muted animate-pulse rounded-md' />
                    </div>
                  ))}
                </div>
              </div>
              <div className='h-11 w-full bg-muted animate-pulse rounded-md' />
            </div>
          </div>
        </div>
      ) : loadError && !baseline ? (
        <div className='space-y-3' role='alert'>
          <p>Could not load this menu item.</p>
          <Button type='button' variant='outline' onClick={() => void fetchCategoriesAndItem()}>
            <RefreshCw className='size-4' /> Retry
          </Button>
        </div>
      ) : (
        <>
          <Breadcrumb className='mb-4'>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/admin-dashboard/menu-items'>Menu Items</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>Edit menu item</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Title>Edit Menu Item</Title>

          {conflict && (
            <div
              className='mx-auto mt-6 max-w-3xl space-y-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4'
              role='alert'
            >
              <p className='font-medium'>Changes not saved</p>
              <p className='text-sm'>{conflict}</p>
              <p className='text-sm text-muted-foreground'>
                Your draft is still in the form below.
              </p>
              <Button type='button' variant='outline' onClick={() => setConfirmReload(true)}>
                <RefreshCw className='size-4' /> Reload latest item
              </Button>
            </div>
          )}

          <AlertDialog open={confirmReload} onOpenChange={setConfirmReload}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard this draft and load the latest item?</AlertDialogTitle>
                <AlertDialogDescription>
                  Unsaved text, stock changes and the selected image will be replaced only after the
                  latest item loads successfully.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep draft</AlertDialogCancel>
                <AlertDialogAction onClick={() => void fetchCategoriesAndItem()}>
                  Reload latest
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Form {...form}>
            <form className='mt-8 max-w-2xl lg:max-w-3xl mx-auto' onSubmit={handleSubmit}>
              <div className='flex flex-col md:flex-row items-start gap-6'>
                <MenuItemImage
                  imagePreview={imagePreview}
                  image={image}
                  onImageSelect={handleImageSelect}
                  disabled={isSaving}
                />

                <MenuItemForm
                  name={name}
                  categoryId={categoryId}
                  categories={categories}
                  description={description}
                  priceType={priceType}
                  priceSmall={priceSmall}
                  priceMedium={priceMedium}
                  priceLarge={priceLarge}
                  maxQuantityPerOrder={maxQuantityPerOrder}
                  trackInventory={trackInventory}
                  stockQuantity={stockQuantity}
                  lowStockThreshold={lowStockThreshold}
                  isAvailable={isAvailable}
                  editingItem={id}
                  isSaving={isSaving}
                  saveDisabled={!baseline || Boolean(conflict) || isDescriptionGenerating}
                  inventorySnapshot={
                    baseline?.trackInventory
                      ? {
                          stock: baseline.stockQuantity ?? 0,
                          reserved: baseline.reservedStockQuantity ?? 0,
                        }
                      : undefined
                  }
                  isDescriptionGenerating={isDescriptionGenerating}
                  onNameChange={setName}
                  onCategoryChange={setCategoryId}
                  onDescriptionChange={setDescription}
                  onGenerateDescription={handleGenerateDescription}
                  onPriceTypeChange={handlePriceTypeChange}
                  onPriceSmallChange={setPriceSmall}
                  onPriceMediumChange={setPriceMedium}
                  onPriceLargeChange={setPriceLarge}
                  onMaxQuantityPerOrderChange={setMaxQuantityPerOrder}
                  onTrackInventoryChange={setTrackInventory}
                  onStockQuantityChange={setStockQuantity}
                  onLowStockThresholdChange={setLowStockThreshold}
                  onAvailabilityChange={setIsAvailable}
                  onCancel={() => router.push('/admin-dashboard/menu-items')}
                />
              </div>
            </form>
          </Form>
        </>
      )}
    </section>
  );
};

export default EditMenuItemPage;
