'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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
import Image from 'next/image';

interface MenuItem {
  _id: string;
  image?: string;
  name: string;
  description: string;
  category?: { _id: string; name: string } | string;
  priceSmall: number;
  priceMedium: number;
  priceLarge: number;
}

interface MenuItemsProps {
  menuItems: MenuItem[];
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
}

type CategoryConfig = {
  label: string;
  matchers: string[];
};

const categories: CategoryConfig[] = [
  { label: 'Pizza', matchers: ['pizza'] },
  { label: 'Pasta', matchers: ['pasta'] },
  { label: 'Desserts', matchers: ['desserts', 'deserts'] },
  { label: 'Soup', matchers: ['soup', 'soups'] },
  { label: 'Coffee', matchers: ['coffee', 'coffee'] },
];

const getCategoryName = (item: MenuItem) => {
  if (typeof item.category === 'string') return item.category.toLowerCase();
  return item.category?.name?.toLowerCase() || '';
};

const AdminItemCard = ({ item, onEdit, onDelete }: { item: MenuItem; onEdit: (i: MenuItem) => void; onDelete: (id: string) => void }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete(item._id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Card className='hover:bg-accent/20 transition'>
        <CardContent className='flex items-center gap-4'>
          <div className='relative w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0'>
            {item.image ? (
              <Image src={item.image} alt={item.name} fill className='object-cover' />
            ) : (
              <div className='w-full h-full flex items-center justify-center text-muted-foreground text-xs'>No image</div>
            )}
          </div>

          <div className='grow'>
            <h3 className='font-semibold text-lg'>{item.name}</h3>
            {item.category && (
              <p className='text-xs text-muted-foreground'>
                Category: {typeof item.category === 'string' ? item.category : item.category?.name}
              </p>
            )}
            {item.description && <p className='text-muted-foreground/80 text-sm'>{item.description}</p>}

            {item.priceSmall !== undefined && item.priceMedium !== undefined && item.priceLarge !== undefined ? (
              <div className='flex gap-3 mt-2'>
                <span className='text-sm'>
                  <span className='text-muted-foreground'>S:</span>{' '}
                  <span className='font-semibold text-primary'>${item.priceSmall.toFixed(2)}</span>
                </span>
                <span className='text-sm'>
                  <span className='text-muted-foreground'>M:</span>{' '}
                  <span className='font-semibold text-primary'>${item.priceMedium.toFixed(2)}</span>
                </span>
                <span className='text-sm'>
                  <span className='text-muted-foreground'>L:</span>{' '}
                  <span className='font-semibold text-primary'>${item.priceLarge.toFixed(2)}</span>
                </span>
              </div>
            ) : (
              <p className='text-destructive text-sm mt-1'>Prices missing - please edit this item</p>
            )}
          </div>
        </CardContent>
        <CardFooter className='flex-col gap-2'>
          <Button className='w-full' variant='outline' onClick={() => onEdit(item)}>Edit</Button>
          <Button className='w-full' variant='destructive' onClick={handleDeleteClick}>Delete</Button>
        </CardFooter>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const MenuItems = ({ menuItems, onEdit, onDelete }: MenuItemsProps) => {
  if (menuItems.length === 0) {
    return (
      <div className='mt-12'>
        <h2 className='text-2xl font-semibold mb-4'>Menu Items</h2>
        <p className='text-gray-500 text-center py-8'>No menu items yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className='mt-12'>
      <h2 className='text-2xl font-semibold mb-6'>Menu Items</h2>

      <div className='space-y-10'>
        {categories.map((cat) => {
          const items = menuItems.filter((mi) => cat.matchers.some((m) => getCategoryName(mi) === m));
          return (
            <section key={cat.label}>
              <h3 className='text-xl font-semibold mb-4'>{cat.label}</h3>
              {items.length > 0 ? (
                <div className='grid grid-cols-1 gap-4'>
                  {items.map((item) => (
                    <AdminItemCard key={item._id} item={item} onEdit={onEdit} onDelete={onDelete} />
                  ))}
                </div>
              ) : (
                <p className='text-muted-foreground'>No menu items found at the moment.</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default MenuItems;