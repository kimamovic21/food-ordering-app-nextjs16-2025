import Link from 'next/link';

interface UserTabsProps {
  isAdmin?: boolean;
};

const UserTabs = ({ isAdmin = false }: UserTabsProps) => {
  return (
    <div className='flex justify-center gap-2 tabs'>
      <Link className={'active'} href={'/profile'}>
        Profile
      </Link>
      
      {isAdmin && (
        <>
          <Link href={'/categories'}>
            Categories
          </Link>
          <Link href={'/menu-items'}>
            Menu Items
          </Link>
          <Link href={'/users'}>
            Users
          </Link>
        </>
      )}
    </div>
  );
};

export default UserTabs