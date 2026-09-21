'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/libs/queryKeys';
import type {
  AdminOrdersListResponse,
  CustomerOrdersListResponse,
  OrderQueueResponse,
  UsualOrderResponse,
} from '@/types/order';

export const ADMIN_ORDERS_REFETCH_INTERVAL_MS = 10_000;
export const ORDER_QUEUE_REFETCH_INTERVAL_MS = 15_000;

export class OrderListQueryError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'OrderListQueryError';
    this.status = status;
  }
}

const readJson = async (response: Response) => response.json().catch(() => ({}));

const getErrorMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
  }

  return fallback;
};

export const getOrderListErrorStatus = (error: unknown) =>
  error instanceof OrderListQueryError ? error.status : null;

export const fetchAdminOrdersPage = async (page: number): Promise<AdminOrdersListResponse> => {
  const response = await fetch(`/api/orders?page=${page}`, { cache: 'no-store' });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new OrderListQueryError(
      getErrorMessage(payload, 'Failed to load orders.'),
      response.status
    );
  }

  const data = payload as Partial<AdminOrdersListResponse>;

  return {
    orders: Array.isArray(data.orders) ? data.orders : [],
    page: Number(data.page || page),
    totalOrders: Number(data.totalOrders || 0),
    totalPages: Number(data.totalPages || 1),
  };
};

export const fetchCustomerOrdersPage = async (
  page: number
): Promise<CustomerOrdersListResponse> => {
  const response = await fetch(`/api/my-orders?page=${page}`, { cache: 'no-store' });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new OrderListQueryError(
      getErrorMessage(payload, 'Failed to fetch orders.'),
      response.status
    );
  }

  const data = payload as Partial<CustomerOrdersListResponse>;

  return {
    orders: Array.isArray(data.orders) ? data.orders : [],
    page: Number(data.page || page),
    totalOrders: Number(data.totalOrders || 0),
    totalPages: Number(data.totalPages || 1),
  };
};

export const fetchOrderQueue = async (): Promise<OrderQueueResponse> => {
  const response = await fetch('/api/orders/queue', { cache: 'no-store' });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new OrderListQueryError(
      getErrorMessage(payload, 'Failed to load order queue.'),
      response.status
    );
  }

  const data = payload as Partial<OrderQueueResponse>;

  return {
    lateThresholdMinutes: Number(data.lateThresholdMinutes || 120),
    orders: Array.isArray(data.orders) ? data.orders : [],
  };
};

export const fetchUsualOrder = async (): Promise<UsualOrderResponse> => {
  const response = await fetch('/api/my-orders/usual', { cache: 'no-store' });
  const payload = await readJson(response);

  if (!response.ok) {
    throw new OrderListQueryError(
      getErrorMessage(payload, 'Failed to load usual order.'),
      response.status
    );
  }

  const data = payload as Partial<UsualOrderResponse>;

  return {
    error: typeof data.error === 'string' ? data.error : undefined,
    usualOrder: data.usualOrder || null,
  };
};

export const useAdminOrdersListQuery = (page: number, enabled: boolean) =>
  useQuery({
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => fetchAdminOrdersPage(page),
    queryKey: queryKeys.orders.adminList(page),
    refetchInterval: ADMIN_ORDERS_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

export const useCustomerOrdersListQuery = (page: number, enabled: boolean) =>
  useQuery({
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => fetchCustomerOrdersPage(page),
    queryKey: queryKeys.orders.customerList(page),
    refetchOnWindowFocus: true,
  });

export const useOrderQueueQuery = (enabled: boolean) =>
  useQuery({
    enabled,
    queryFn: fetchOrderQueue,
    queryKey: queryKeys.orders.queue(),
    refetchInterval: ORDER_QUEUE_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  });

export const useUsualOrderQuery = (enabled: boolean) =>
  useQuery({
    enabled,
    queryFn: fetchUsualOrder,
    queryKey: queryKeys.orders.usual(),
    staleTime: 60 * 1000,
  });
