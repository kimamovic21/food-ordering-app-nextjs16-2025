'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';
import toast from 'react-hot-toast';
import useProfile from '@/contexts/UseProfile';
import Title from '@/components/shared/Title';
import MenuItems from './MenuItems';

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

const MenuItemsListPage = () => {
  const router = useRouter();
  const { data, loading } = useProfile();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const res = await fetch('/api/menu-items');
      const items = await res.json();
      setMenuItems(items);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    router.push(`/menu-items/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/menu-items?_id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Delete failed');

      toast.success('Menu item deleted');
      fetchMenuItems();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete menu item');
    }
  };

  const showSkeleton = loading || isLoading;

  if (!loading && !data?.admin) return 'Not an admin.';

  return (
    <section className='mt-8'>
      {showSkeleton ? (
        <div className='space-y-10'>
          <div className='space-y-3'>
            <div className='h-4 w-40 md:w-48 bg-muted animate-pulse rounded-md' />
            <div className='flex items-center justify-between'>
              <div className='h-10 w-60 md:w-80 bg-muted animate-pulse rounded-md' />
              <div className='h-10 w-40 md:w-48 bg-muted animate-pulse rounded-md' />
            </div>
          </div>

          {[1, 2, 3].map((section) => (
            <div key={section} className='space-y-5'>
              <div className='h-7 w-64 md:w-80 bg-muted animate-pulse rounded-md' />
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {[1, 2, 3].map((card) => (
                  <div
                    key={card}
                    className='rounded-xl border border-border/50 bg-muted/30 overflow-hidden flex flex-col'
                  >
                    <div className='h-52 w-full bg-muted animate-pulse' />
                    <div className='p-4 space-y-3'>
                      <div className='h-5 w-4/5 bg-muted animate-pulse rounded-md' />
                      <div className='h-3 w-2/5 bg-muted animate-pulse rounded-md' />
                      <div className='space-y-2'>
                        <div className='h-3 w-full bg-muted animate-pulse rounded-md' />
                        <div className='h-3 w-11/12 bg-muted animate-pulse rounded-md' />
                      </div>
                      <div className='flex gap-2 text-xs'>
                        <div className='h-3 w-16 bg-muted animate-pulse rounded-md' />
                        <div className='h-3 w-16 bg-muted animate-pulse rounded-md' />
                        <div className='h-3 w-16 bg-muted animate-pulse rounded-md' />
                      </div>
                      <div className='flex gap-2 pt-2'>
                        <div className='h-9 w-full bg-muted animate-pulse rounded-md' />
                        <div className='h-9 w-full bg-muted animate-pulse rounded-md' />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <Breadcrumb className='mb-4'>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href='/menu-items'>Menu Items</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className='flex items-center justify-between mb-6'>
            <Title>Menu Items</Title>
            <Button onClick={() => router.push('/menu-items/new')}>Create New Item</Button>
          </div>

          <MenuItems menuItems={menuItems} onEdit={handleEdit} onDelete={handleDelete} />
        </>
      )}
    </section>
  );
};

export default MenuItemsListPage;
