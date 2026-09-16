export const normalizeCustomerOrder = (order: any) => {
  const { adminInternalNote: _adminInternalNote, ...safeOrder } = order;

  return {
    ...safeOrder,
    paymentStatus: Boolean(order.orderPaid || order.paymentStatus || order.paid),
    orderStatus: order.orderStatus || 'pending',
    courier:
      order.courierId && typeof order.courierId === 'object'
        ? {
            _id: String(order.courierId._id || ''),
            name: order.courierId.name || '',
            email: order.courierId.email || '',
            image: order.courierId.image || null,
          }
        : null,
  };
};
