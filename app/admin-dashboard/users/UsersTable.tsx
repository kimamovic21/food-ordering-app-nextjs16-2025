'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Loader2, Pencil, Trash2 } from 'lucide-react';

import {
  createDataTableColumnHelper,
  TanStackDataTable,
  type DataTableColumnDef,
} from '@/components/shared/TanStackDataTable';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { AdminUserListItem } from '@/types/user';

type UserRow = AdminUserListItem;

type UsersTableProps = {
  users: UserRow[];
  currentUserEmail?: string | null;
  deletingUserId?: string | null;
  onDeleteUser?: (user: UserRow) => void | Promise<void>;
};

const columnHelper = createDataTableColumnHelper<UserRow>();

function getUserRole(user: UserRow) {
  return (user.role || (user.admin ? 'admin' : 'user')).toLowerCase();
}

function RoleBadge({ role }: { role: string }) {
  const label = role.charAt(0).toUpperCase() + role.slice(1);
  const className =
    role === 'admin'
      ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100'
      : role === 'courier'
        ? 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100'
        : '';

  return (
    <Badge variant='secondary' className={`${className} capitalize`}>
      {label}
    </Badge>
  );
}

function DeleteUserAction({
  user,
  currentUserEmail,
  deletingUserId,
  onDeleteUser,
}: {
  user: UserRow;
  currentUserEmail?: string | null;
  deletingUserId?: string | null;
  onDeleteUser?: (user: UserRow) => void | Promise<void>;
}) {
  const isDeleting = deletingUserId === user._id;
  const isCurrentUser = Boolean(currentUserEmail && user.email === currentUserEmail);
  const disabled = isDeleting || isCurrentUser || !onDeleteUser;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type='button'
          data-slot='button'
          disabled={disabled}
          title={
            isCurrentUser
              ? 'You cannot delete your own super admin account'
              : 'Delete user and related data'
          }
          aria-label='Delete user'
          className='inline-flex size-4 cursor-pointer appearance-none items-center justify-center border-0 bg-transparent p-0 text-red-400 shadow-none outline-none transition hover:bg-transparent hover:text-red-500 focus-visible:ring-2 focus-visible:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-40'
        >
          {isDeleting ? (
            <Loader2 className='size-4 animate-spin' aria-hidden='true' />
          ) : (
            <Trash2 className='size-4' aria-hidden='true' />
          )}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this user?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes {user.name || user.email}. If this user owns a restaurant, the
            restaurant, menu items, coupons, restaurant availability requests, related images, and
            related reviews are cleaned up too. Historical orders stay saved for reporting.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            onClick={() => {
              void onDeleteUser?.(user);
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete user'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const createUsersTableColumns = ({
  currentUserEmail,
  deletingUserId,
  onDeleteUser,
}: Pick<UsersTableProps, 'currentUserEmail' | 'deletingUserId' | 'onDeleteUser'>) =>
  columnHelper.columns([
    columnHelper.accessor((user) => user._id, {
      id: 'id',
      header: 'ID',
      cell: ({ row }) => (
        <span className='font-mono text-xs text-muted-foreground'>
          {row.original._id.slice(-8)}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'photo',
      header: 'Photo',
      cell: ({ row }) => (
        <Avatar className='size-12'>
          <AvatarImage
            src={row.original.image || '/user-default-image.webp'}
            alt={`${row.original.name}'s avatar`}
            referrerPolicy='no-referrer'
          />
          <AvatarFallback className='text-xs text-gray-400 dark:text-gray-500'>
            {row.original.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      ),
      enableGlobalFilter: false,
      enableSorting: false,
    }),
    columnHelper.accessor((user) => user.name, {
      id: 'name',
      header: 'Name',
      cell: ({ getValue }) => <span className='font-semibold'>{getValue()}</span>,
    }),
    columnHelper.accessor((user) => user.email, {
      id: 'email',
      header: 'Email',
      cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue()}</span>,
    }),
    columnHelper.accessor((user) => getUserRole(user), {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => <RoleBadge role={getUserRole(row.original)} />,
    }),
    columnHelper.accessor((user) => user.phone || '', {
      id: 'phone',
      header: 'Phone',
      cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue() || '-'}</span>,
    }),
    columnHelper.accessor((user) => user.streetAddress || '', {
      id: 'streetAddress',
      header: 'Street address',
      cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue() || '-'}</span>,
    }),
    columnHelper.accessor((user) => [user.city, user.postalCode].filter(Boolean).join(' '), {
      id: 'cityPostal',
      header: 'City / Postal',
      cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue() || '-'}</span>,
    }),
    columnHelper.accessor((user) => user.country || '', {
      id: 'country',
      header: 'Country',
      cell: ({ getValue }) => <span className='text-muted-foreground'>{getValue() || '-'}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className='flex items-center gap-1'>
          <Link
            href={`/admin-dashboard/users/${row.original._id}`}
            aria-label='Edit user'
            className='inline-flex size-9 items-center justify-center text-muted-foreground transition hover:text-primary'
          >
            <Pencil className='size-4' aria-hidden='true' />
          </Link>
          <DeleteUserAction
            user={row.original}
            currentUserEmail={currentUserEmail}
            deletingUserId={deletingUserId}
            onDeleteUser={onDeleteUser}
          />
        </div>
      ),
      enableGlobalFilter: false,
      enableHiding: false,
      enableSorting: false,
    }),
  ]) satisfies DataTableColumnDef<UserRow>[];

const userColumnLabels = {
  actions: 'Actions',
  cityPostal: 'City / Postal',
  country: 'Country',
  email: 'Email',
  id: 'ID',
  name: 'Name',
  phone: 'Phone',
  photo: 'Photo',
  role: 'Role',
  streetAddress: 'Street address',
};

const UsersTable = ({ currentUserEmail, deletingUserId, onDeleteUser, users }: UsersTableProps) => {
  const usersTableColumns = useMemo(
    () => createUsersTableColumns({ currentUserEmail, deletingUserId, onDeleteUser }),
    [currentUserEmail, deletingUserId, onDeleteUser]
  );

  return (
    <TanStackDataTable
      columns={usersTableColumns}
      data={users}
      tableKey='admin-users'
      searchPlaceholder='Search users by name, email, role, or city...'
      emptyMessage='No users found.'
      minWidthClassName='min-w-[1200px]'
      columnLabels={userColumnLabels}
    />
  );
};

export default UsersTable;
