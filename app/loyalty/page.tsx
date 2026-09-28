import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/libs/authOptions';
import { Order } from '@/models/order';
import { User } from '@/models/user';
import { LOYALTY_TIERS, calculateLoyaltyStatus } from '@/libs/loyaltyCalculator';
import { getUserLoyaltyLedger } from '@/libs/loyaltyLedger';
import { mongoConnect } from '@/libs/mongoConnect';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BadgeDollarSign,
  CheckCircle2,
  Gift,
  Info,
  Lock,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { formatAppDateTime } from '@/libs/dateFormat';
import { formatMoney } from '@/libs/money';
import type { LoyaltyLedgerEntryType } from '@/types/loyalty';

type LoyaltyOrderHistory = {
  _id: string;
  total: number;
  deliveryFee?: number;
  loyaltyDiscount?: number;
  loyaltyDiscountPercentage?: number;
  loyaltyTier?: string | null;
  couponCode?: string | null;
  couponDiscountAmount?: number;
  completedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

const LEDGER_LABELS: Record<LoyaltyLedgerEntryType, string> = {
  order_completed: 'Order completed',
  discount_applied: 'Reward applied',
  reward_reversed: 'Reward reversed',
};

const getLedgerBadgeClassName = (type: LoyaltyLedgerEntryType, status: string) => {
  if (status === 'reversed' || type === 'reward_reversed') {
    return 'border-red-500/40 bg-red-500/10 text-red-600';
  }

  if (type === 'discount_applied') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600';
  }

  return 'border-primary/40 bg-primary/10 text-primary';
};

const getLedgerValue = (entry: {
  type: LoyaltyLedgerEntryType;
  orderCountDelta: number;
  discountAmount: number;
}) => {
  if (entry.type === 'discount_applied') {
    return `Saved ${formatMoney(entry.discountAmount)}`;
  }

  if (entry.type === 'reward_reversed') {
    return 'Reward reversed';
  }

  return entry.orderCountDelta > 0 ? '+1 completed order' : 'Order tracked';
};

export default async function LoyaltyPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return redirect('/login');
  }

  await mongoConnect();

  // Find user by email and count completed orders
  const user = await User.findOne({ email: session.user.email });

  if (!user) {
    return redirect('/login');
  }

  // Count completed orders for the user
  const completedOrderCount = await Order.countDocuments({
    userId: user._id,
    orderStatus: 'completed',
  });
  const recentCompletedOrders = (await Order.find({
    userId: user._id,
    orderStatus: 'completed',
  })
    .select(
      '_id total deliveryFee loyaltyDiscount loyaltyDiscountPercentage loyaltyTier couponCode couponDiscountAmount completedAt createdAt'
    )
    .sort({ completedAt: -1, createdAt: -1 })
    .limit(8)
    .lean()) as unknown as LoyaltyOrderHistory[];

  const loyaltyStatus = calculateLoyaltyStatus(completedOrderCount);
  const loyaltyLedger = await getUserLoyaltyLedger(user._id, { limit: 10 });
  const totalLoyaltySavings = loyaltyLedger.summary.totalDiscountApplied;
  const totalReversedSavings = loyaltyLedger.summary.totalDiscountReversed;
  const legacyLedgerGap = Math.max(0, completedOrderCount - loyaltyLedger.summary.earnedOrders);
  const totalCouponSavings = recentCompletedOrders.reduce(
    (sum, order) => sum + (Number(order.couponDiscountAmount) || 0),
    0
  );

  return (
    <section className='max-w-4xl mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2 flex items-center gap-2'>
          <Trophy className='h-8 w-8 text-yellow-500' />
          Loyalty Rewards
        </h1>
        <p className='text-muted-foreground'>
          Earn exclusive discounts based on your order history
        </p>
      </div>

      {/* Current Status Card */}
      <Card className='mb-6 border-2'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Gift className='h-5 w-5' />
            Your Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm text-muted-foreground mb-1'>Current Tier</p>
                {loyaltyStatus.currentTier ? (
                  <Badge className='text-lg px-4 py-1'>
                    <span className='text-white font-semibold'>
                      {loyaltyStatus.currentTier.name}
                    </span>
                  </Badge>
                ) : (
                  <p className='text-sm'>No tier yet - Complete your first order!</p>
                )}
              </div>
              <div className='text-right'>
                <p className='text-sm text-muted-foreground mb-1'>Discount</p>
                <p className='text-3xl font-bold text-green-600'>
                  {loyaltyStatus.discountPercentage}%
                </p>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <ShoppingBag className='h-4 w-4 text-muted-foreground' />
              <p className='text-sm'>
                <span className='font-semibold'>{loyaltyStatus.totalOrders}</span> completed orders
              </p>
            </div>

            {loyaltyStatus.nextTier && (
              <div className='mt-4 p-4 bg-muted rounded-lg'>
                <div className='flex items-center gap-2 mb-2'>
                  <TrendingUp className='h-4 w-4' />
                  <p className='text-sm font-semibold'>Next Tier Progress</p>
                </div>
                <div className='space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span>{loyaltyStatus.nextTier.name} Tier</span>
                    <span className='text-muted-foreground'>
                      {loyaltyStatus.ordersToNextTier} orders to go
                    </span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2.5'>
                    <div
                      className='bg-blue-600 h-2.5 rounded-full transition-all'
                      style={{
                        width: `${(loyaltyStatus.totalOrders / loyaltyStatus.nextTier.ordersRequired) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Unlock {loyaltyStatus.nextTier.discountPercentage}% discount at{' '}
                    {loyaltyStatus.nextTier.ordersRequired} orders
                  </p>
                </div>
              </div>
            )}

            {!loyaltyStatus.nextTier && loyaltyStatus.currentTier && (
              <div className='mt-4 p-4 bg-linear-to-r from-purple-500/10 to-pink-500/10 rounded-lg border-2 border-purple-300'>
                <p className='text-center font-semibold text-purple-700'>
                  🎉 Congratulations! You&apos;ve reached the highest tier! 🎉
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className='mb-6'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <BadgeDollarSign className='h-5 w-5 text-primary' />
            Rewards Ledger
          </CardTitle>
          <CardDescription>
            A transparent history of loyalty rewards earned, applied, and reversed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='rounded-lg border bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground'>Active reward orders</p>
              <p className='text-xl font-semibold'>{loyaltyLedger.summary.earnedOrders}</p>
            </div>
            <div className='rounded-lg border bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground'>Total loyalty savings</p>
              <p className='text-xl font-semibold text-green-600'>
                {formatMoney(totalLoyaltySavings)}
              </p>
            </div>
            <div className='rounded-lg border bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground'>Reversed rewards</p>
              <p className='text-xl font-semibold text-red-600'>
                {loyaltyLedger.summary.reversedOrders}
              </p>
            </div>
            <div className='rounded-lg border bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground'>Reversed savings</p>
              <p className='text-xl font-semibold text-red-600'>
                {formatMoney(totalReversedSavings)}
              </p>
            </div>
          </div>

          {legacyLedgerGap > 0 && (
            <div className='mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300'>
              <div className='flex gap-2'>
                <Info className='mt-0.5 h-4 w-4 shrink-0' />
                <div>
                  <p className='font-semibold'>Legacy orders included</p>
                  <p className='mt-1'>
                    {legacyLedgerGap} older completed{' '}
                    {legacyLedgerGap === 1 ? 'order counts' : 'orders count'} toward your tier but{' '}
                    {legacyLedgerGap === 1 ? 'does' : 'do'} not have detailed ledger activity yet.
                  </p>
                </div>
              </div>
            </div>
          )}

          {loyaltyLedger.entries.length === 0 ? (
            <p className='rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground'>
              Complete your first paid order to start a loyalty ledger.
            </p>
          ) : (
            <div className='space-y-3'>
              {loyaltyLedger.entries.map((entry) => (
                <div
                  key={entry._id}
                  className='flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'
                >
                  <div className='min-w-0'>
                    <div className='mb-2 flex flex-wrap items-center gap-2'>
                      <Badge
                        variant='outline'
                        className={getLedgerBadgeClassName(entry.type, entry.status)}
                      >
                        {entry.type === 'reward_reversed' ? (
                          <RotateCcw className='mr-1 h-3 w-3' />
                        ) : (
                          <CheckCircle2 className='mr-1 h-3 w-3' />
                        )}
                        {LEDGER_LABELS[entry.type]}
                      </Badge>
                      {entry.tierName && <Badge variant='secondary'>{entry.tierName}</Badge>}
                    </div>
                    <Link
                      href={`/my-orders/${entry.orderId}`}
                      className='font-semibold text-foreground hover:text-primary'
                    >
                      Order #{entry.orderId.slice(-6)}
                    </Link>
                    <p className='mt-1 text-sm text-muted-foreground'>{entry.description}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {formatAppDateTime(entry.createdAt)}
                    </p>
                  </div>
                  <div className='text-left text-sm font-semibold sm:text-right'>
                    {getLedgerValue(entry)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>All Loyalty Tiers</CardTitle>
          <CardDescription>Complete more orders to unlock higher discounts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {LOYALTY_TIERS.map((tier) => {
              const isUnlocked = completedOrderCount >= tier.ordersRequired;
              const isCurrent = loyaltyStatus.currentTier?.name === tier.name;
              const TierIcon = isUnlocked ? CheckCircle2 : Lock;

              return (
                <div
                  key={tier.name}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                      : isUnlocked
                        ? 'border-green-300 bg-green-50 dark:bg-green-950/20'
                        : 'border-gray-200 bg-gray-50 dark:bg-gray-900/20'
                  }`}
                >
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                          isUnlocked
                            ? 'border-green-500/40 bg-green-500/10 text-green-600'
                            : 'border-muted-foreground/30 bg-muted text-muted-foreground'
                        }`}
                      >
                        <TierIcon className='h-5 w-5' />
                      </div>
                      <div>
                        <h3 className={`font-semibold ${tier.color}`}>
                          {tier.name} Tier
                          {isCurrent && (
                            <Badge variant='outline' className='ml-2'>
                              Current
                            </Badge>
                          )}
                        </h3>
                        <p className='text-sm text-muted-foreground'>
                          {tier.ordersRequired} {tier.ordersRequired === 1 ? 'order' : 'orders'}{' '}
                          required
                        </p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='text-2xl font-bold text-green-600'>
                        {tier.discountPercentage}%
                      </p>
                      <p className='text-xs text-muted-foreground'>discount</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className='mt-6'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <ReceiptText className='h-5 w-5' />
            Loyalty History
          </CardTitle>
          <CardDescription>
            Recent completed orders that count toward your loyalty tier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='mb-4 grid gap-3 sm:grid-cols-3'>
            <div className='rounded-lg border bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground'>Completed orders</p>
              <p className='text-xl font-semibold'>{completedOrderCount}</p>
            </div>
            <div className='rounded-lg border bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground'>Ledger loyalty savings</p>
              <p className='text-xl font-semibold text-green-600'>
                {formatMoney(totalLoyaltySavings)}
              </p>
            </div>
            <div className='rounded-lg border bg-muted/30 p-3'>
              <p className='text-xs text-muted-foreground'>Recent coupon savings</p>
              <p className='text-xl font-semibold text-green-600'>
                {formatMoney(totalCouponSavings)}
              </p>
            </div>
          </div>

          {recentCompletedOrders.length === 0 ? (
            <p className='rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground'>
              Complete your first order to start building loyalty history.
            </p>
          ) : (
            <div className='space-y-3'>
              {recentCompletedOrders.map((order) => {
                const date = order.completedAt || order.createdAt;
                const loyaltyDiscount = Number(order.loyaltyDiscount) || 0;
                const couponDiscount = Number(order.couponDiscountAmount) || 0;

                return (
                  <div
                    key={order._id.toString()}
                    className='flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'
                  >
                    <div>
                      <p className='font-semibold'>Order #{order._id.toString().slice(-6)}</p>
                      <p className='text-sm text-muted-foreground'>
                        {formatAppDateTime(date, 'Completed order')}
                      </p>
                      <div className='mt-2 flex flex-wrap gap-2'>
                        {order.loyaltyTier && (
                          <Badge variant='secondary'>{order.loyaltyTier}</Badge>
                        )}
                        {order.couponCode && <Badge variant='outline'>{order.couponCode}</Badge>}
                      </div>
                    </div>
                    <div className='text-left sm:text-right'>
                      <p className='font-semibold'>{formatMoney(Number(order.total || 0))}</p>
                      <p className='text-sm text-green-600'>
                        Saved {formatMoney(loyaltyDiscount + couponDiscount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className='mt-6 p-4 bg-muted rounded-lg'>
        <h3 className='font-semibold mb-2'>How it works</h3>
        <ul className='list-disc space-y-1 pl-5 text-sm text-muted-foreground'>
          <li>Complete paid orders to earn loyalty tier progress.</li>
          <li>
            Loyalty discounts are calculated at checkout from the eligible food subtotal after
            coupon discounts.
          </li>
          <li>Each completed order stores the tier, percentage, and discount snapshot.</li>
          <li>
            Refund or cancellation edge cases can reverse ledger rewards without duplicating rows.
          </li>
        </ul>
      </div>
    </section>
  );
}
