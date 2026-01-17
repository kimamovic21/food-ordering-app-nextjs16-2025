import { FeeBreakdown } from '@/libs/deliveryFeeCalculator';

interface DeliveryFeeBreakdownProps {
  feeBreakdown: FeeBreakdown;
  showDetails?: boolean;
}

export function DeliveryFeeBreakdown({
  feeBreakdown,
  showDetails = true,
}: DeliveryFeeBreakdownProps) {
  return (
    <div className='space-y-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700'>
      <h3 className='font-semibold text-foreground'>Delivery Fee Breakdown</h3>

      {showDetails && (
        <div className='space-y-1 text-sm'>
          <div className='flex justify-between text-gray-600 dark:text-gray-400'>
            <span>Base Fee:</span>
            <span>${feeBreakdown.baseFee.toFixed(2)}</span>
          </div>

          {feeBreakdown.weatherAdjustment > 0 && (
            <div className='flex justify-between text-blue-600 dark:text-blue-400'>
              <span>
                Weather Adjustment
                {feeBreakdown.weather && ` (${feeBreakdown.weather.condition})`}:
              </span>
              <span>+${feeBreakdown.weatherAdjustment.toFixed(2)}</span>
            </div>
          )}

          {feeBreakdown.totalAdjustment === 0 && (
            <div className='text-gray-500 dark:text-gray-400 text-xs py-1'>
              No weather adjustments apply
            </div>
          )}
        </div>
      )}

      <div className='border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between font-bold text-lg'>
        <span>Total Delivery Fee:</span>
        <span className='text-green-600 dark:text-green-400'>
          ${feeBreakdown.totalFee.toFixed(2)}
        </span>
      </div>

      {feeBreakdown.weather && (
        <div className='text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-slate-200 dark:border-slate-600'>
          <p>Temperature: {feeBreakdown.weather.temperature}°C</p>
          <p>Wind Speed: {feeBreakdown.weather.windSpeed} kph</p>
        </div>
      )}
    </div>
  );
}

/**
 * Simple delivery fee display (just total)
 */
export function DeliveryFeeSimple({ feeBreakdown }: DeliveryFeeBreakdownProps) {
  return (
    <div className='flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900'>
      <span className='font-medium text-foreground'>Delivery Fee:</span>
      <span className='text-lg font-bold text-green-600 dark:text-green-400'>
        ${feeBreakdown.totalFee.toFixed(2)}
      </span>
    </div>
  );
}
