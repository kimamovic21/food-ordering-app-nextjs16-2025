'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import UserTabs from '@/components/shared/UserTabs';
import useProfile from '@/contexts/UseProfile';

interface MenuItem {
  _id: string;
  image?: string;
  name: string;
  description: string;
  basePrice: number;
}

const MenuItemsPage = () => {
  const { data, loading } = useProfile();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [image, setImage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    }
  };

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

  const uploadImage = async (file: File, menuItemId?: string): Promise<string> => {
    const data = new FormData();
    data.append('file', file);

    if (menuItemId) {
      data.append('menuItemId', menuItemId);
    }

    const res = await fetch('/api/upload/menu-items', {
      method: 'POST',
      body: data,
    });

    if (!res.ok) {
      throw new Error('Upload failed');
    }

    const json = await res.json();
    return json.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !basePrice) {
      toast.error('Name and price are required');
      return;
    }

    setIsSaving(true);

    try {
      let imageUrl = image;

      if (imageFile) {
        imageUrl = await toast.promise(
          uploadImage(imageFile, editingItem || undefined),
          {
            loading: 'Uploading image...',
            success: 'Image uploaded!',
            error: 'Image upload failed.',
          }
        );
      }

      const menuItemData = {
        name,
        description,
        basePrice: parseFloat(basePrice),
        image: imageUrl || '',
      };

      if (editingItem) {
        const response = await fetch('/api/menu-items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: editingItem, ...menuItemData }),
        });

        if (!response.ok) {
          throw new Error('Failed to update');
        }

        toast.success('Menu item updated!');
      } else {
        const response = await fetch('/api/menu-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(menuItemData),
        });

        if (!response.ok) {
          throw new Error('Failed to create');
        }

        toast.success('Menu item created!');
      }

      setName('');
      setDescription('');
      setBasePrice('');
      setImage('');
      setImageFile(null);
      setImagePreview('');
      setEditingItem(null);
      fetchMenuItems();
    } catch (error) {
      console.error('Error saving menu item:', error);
      toast.error(`Failed to ${editingItem ? 'update' : 'create'} menu item`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item._id);
    setName(item.name);
    setDescription(item.description);
    setBasePrice(item.basePrice.toString());
    setImage(item.image || '');
    setImagePreview(item.image || '');
    setImageFile(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      const response = await fetch(`/api/menu-items?_id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      toast.success('Menu item deleted!');
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error('Failed to delete menu item.');
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setBasePrice('');
    setImage('');
    setImageFile(null);
    setImagePreview('');
  };

  if (loading) {
    return 'Loading user info';
  }

  if (!data?.admin) {
    return 'Not an admin.';
  }

  const displayImage = imagePreview || image;

  return (
    <section className='mt-8'>
      <UserTabs isAdmin={true} />

      <form className='mt-8 max-w-md mx-auto' onSubmit={handleSubmit}>
        <div className='flex items-start gap-6'>
          <div className='flex flex-col items-center'>
            <div className='relative w-28 h-28 md:w-32 md:h-32 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center'>
              {displayImage ? (
                <Image
                  src={displayImage}
                  alt='Menu item'
                  fill
                  className='object-cover'
                />
              ) : (
                <span className='text-gray-400 text-sm'>No image</span>
              )}

              <label className='absolute bottom-2 left-1/2 -translate-x-1/2 bg-white bg-opacity-70 px-2 py-1 rounded-lg text-sm cursor-pointer hover:bg-opacity-90'>
                <input
                  type='file'
                  className='hidden'
                  onChange={handleImageSelect}
                  accept='image/*'
                  disabled={isSaving}
                />
                {displayImage ? 'Edit' : 'Upload'}
              </label>
            </div>
          </div>

          <div className='grow space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Menu item name
              </label>
              <input
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Pizza Margherita'
                disabled={isSaving}
                className='w-full rounded-lg border border-gray-300 bg-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Description
              </label>
              <input
                type='text'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Classic tomato and mozzarella'
                disabled={isSaving}
                className='w-full rounded-lg border border-gray-300 bg-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Base Price <span className='text-gray-400'>(USD)</span>
              </label>
              <div className='relative'>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <span className='text-gray-500'>$</span>
                </div>
                <input
                  type='number'
                  step='0.01'
                  min='0'
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder='9.99'
                  disabled={isSaving}
                  className='pl-7 w-full rounded-lg border border-gray-300 bg-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition'
                />
              </div>
            </div>

            <div className='flex gap-2 pt-2'>
              <button
                type='submit'
                className='grow bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition disabled:bg-gray-100 disabled:cursor-not-allowed'
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
              </button>
              {editingItem && (
                <button
                  type='button'
                  onClick={handleCancel}
                  className='px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition disabled:bg-gray-200 disabled:cursor-not-allowed'
                  disabled={isSaving}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      <div className='mt-12 max-w-2xl mx-auto'>
        <h2 className='text-2xl font-semibold mb-4'>Menu Items</h2>

        {menuItems.length === 0 ? (
          <p className='text-gray-500 text-center py-8'>No menu items yet. Create your first one!</p>
        ) : (
          <div className='grid gap-4'>
            {menuItems.map((item) => (
              <div
                key={item._id}
                className='flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition'
              >
                <div className='relative w-24 h-24 rounded-lg overflow-hidden bg-gray-200 shrink-0'>
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className='object-cover'
                    />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center text-gray-400 text-xs'>
                      No image
                    </div>
                  )}
                </div>

                <div className='grow'>
                  <h3 className='font-semibold text-lg'>{item.name}</h3>
                  {item.description && (
                    <p className='text-gray-600 text-sm'>{item.description}</p>
                  )}
                  <p className='text-primary font-semibold mt-1'>
                    ${item.basePrice.toFixed(2)}
                  </p>
                </div>

                <div className='flex gap-2 shrink-0'>
                  <button
                    onClick={() => handleEdit(item)}
                    className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className='px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default MenuItemsPage;