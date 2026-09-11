'use client';

import { Suspense, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { parseAsInteger, useQueryState } from 'nuqs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Title from '@/components/shared/Title';
import { sonnerToast } from '@/components/shared/SonnerToastComponent';
import useProfile from '@/hooks/useProfile';
import { queryKeys } from '@/libs/queryKeys';
import UsersTable from './UsersTable';
import UsersLoading from './loading';
import type { AdminUserListItem } from '@/types/user';

type AdminUsersListResponse = {
  users: AdminUserListItem[];
  page: number;
  totalPages: number;
  totalUsers: number;
};

const USERS_REFETCH_INTERVAL_MS = 10_000;

const fetchAdminUsers = async (page: number): Promise<AdminUsersListResponse> => {
  const response = await fetch(`/api/users?page=${page}`, {
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || 'Failed to load users.');
  }

  return {
    users: Array.isArray(payload.users) ? payload.users : [],
    page: Number(payload.page || page),
    totalPages: Number(payload.totalPages || 1),
    totalUsers: Number(payload.totalUsers || 0),
  };
};

const UsersPage = () => {
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [pageQuery, setPageQuery] = useQueryState('page', parseAsInteger.withDefault(1));
  const page = Math.max(1, pageQuery);
  const { data, loading } = useProfile();
  const queryClient = useQueryClient();
  const router = useRouter();
  const isSuperAdmin =
    data?.role === 'admin' && data?.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  const usersQuery = useQuery({
    queryKey: queryKeys.users.list(page),
    queryFn: () => fetchAdminUsers(page),
    enabled: !loading && isSuperAdmin,
    refetchInterval: USERS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });
  const usersData = usersQuery.data;
  const users = usersData?.users || [];
  const totalPages = usersData?.totalPages || 1;

  useEffect(() => {
    if (loading) return;

    if (!isSuperAdmin) {
      router.push('/');
    }
  }, [loading, isSuperAdmin, router]);

  const handleDeleteUser = async (user: AdminUserListItem) => {
    const usersListQueryKey = queryKeys.users.list(page);
    const previousUsersData = queryClient.getQueryData<AdminUsersListResponse>(usersListQueryKey);
    let deletionToastId: string | number | undefined;

    setDeletingUserId(user._id);
    queryClient.setQueryData<AdminUsersListResponse>(usersListQueryKey, (currentData) => {
      if (!currentData) {
        return currentData;
      }

      return {
        ...currentData,
        totalUsers: Math.max(0, currentData.totalUsers - 1),
        users: currentData.users.filter((currentUser) => currentUser._id !== user._id),
      };
    });

    try {
      deletionToastId = sonnerToast.loading(`Deleting ${user.name || user.email}...`);

      const response = await fetch(`/api/users?id=${user._id}`, {
        method: 'DELETE',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const activeOrderId = payload?.details?.activeOrderId
          ? ` Active order: ${payload.details.activeOrderId}.`
          : '';
        throw new Error(`${payload?.error || 'Failed to delete user.'}${activeOrderId}`);
      }

      const cloudinaryFailuresCount = payload?.summary?.cloudinaryFailures?.length || 0;
      const successMessage = cloudinaryFailuresCount
        ? `User deleted, but ${cloudinaryFailuresCount} Cloudinary image cleanup task needs manual review.`
        : 'User deleted successfully.';

      sonnerToast.success(successMessage, { id: deletionToastId });

      if ((previousUsersData?.users.length || 0) === 1 && page > 1) {
        void setPageQuery(Math.max(1, page - 1));
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (error) {
      if (previousUsersData) {
        queryClient.setQueryData(usersListQueryKey, previousUsersData);
      }

      sonnerToast.error(
        error instanceof Error ? error.message : 'Something went wrong while deleting this user.',
        { id: deletionToastId }
      );
    } finally {
      setDeletingUserId(null);
    }
  };

  if (loading || (isSuperAdmin && usersQuery.isLoading)) {
    return <UsersLoading />;
  }

  return (
    <section className='mt-8 flex flex-col min-h-[calc(100vh-8rem)] max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10'>
      <Title>Users</Title>

      <div className='mt-8 flex-1 w-full flex flex-col'>
        <div className='flex-1'>
          {usersQuery.isError && (
            <div className='rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive'>
              <p>
                {usersQuery.error instanceof Error
                  ? usersQuery.error.message
                  : 'Failed to load users.'}
              </p>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='mt-3'
                onClick={() => void usersQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          )}

          {!usersQuery.isError && users.length === 0 && <p>No users found.</p>}

          {!usersQuery.isError && users.length > 0 && (
            <Card className='border border-border bg-card text-card-foreground shadow-sm'>
              <UsersTable
                users={users}
                currentUserEmail={data?.email}
                deletingUserId={deletingUserId}
                onDeleteUser={handleDeleteUser}
              />
            </Card>
          )}
        </div>

        <div className='mt-6 flex items-center justify-center gap-4 pb-4'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={`/admin-dashboard/users?page=${Math.max(1, page - 1)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const prev = Math.max(1, page - 1);
                    void setPageQuery(prev);
                  }}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              <div className='flex items-center justify-center px-4 text-sm font-medium text-gray-700 dark:text-gray-200'>
                Page {page} of {totalPages}
              </div>

              <PaginationItem>
                <PaginationNext
                  href={`/admin-dashboard/users?page=${Math.min(totalPages, page + 1)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const next = Math.min(totalPages, page + 1);
                    void setPageQuery(next);
                  }}
                  aria-disabled={page >= totalPages}
                  className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </section>
  );
};

const UsersPageWithSuspense = () => (
  <Suspense fallback={<p className='mt-8'>Loading page...</p>}>
    <UsersPage />
  </Suspense>
);

export default UsersPageWithSuspense;
