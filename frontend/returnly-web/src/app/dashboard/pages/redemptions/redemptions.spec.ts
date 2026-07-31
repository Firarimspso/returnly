import { AdminRedemptionRequestDto, RedemptionRequestStatus } from '../../../core/models/redemption-request.model';
import { redemptionExpiryLabel, sortRedemptionRequests } from './redemptions';

const now = Date.parse('2026-07-29T12:00:00Z');

function request(
  status: RedemptionRequestStatus,
  id: string,
  expiresAt = '2026-07-29T12:06:00Z',
): AdminRedemptionRequestDto {
  return {
    id,
    customerId: `customer-${id}`,
    customerName: status === 'Pending' ? 'Maya Haddad' : 'Karim Nassar',
    customerEmail: `${id}@example.com`,
    rewardId: `reward-${id}`,
    rewardName: status === 'Pending' ? 'Free Specialty Coffee' : 'Dinner Discount',
    requiredPoints: status === 'Pending' ? 75 : 250,
    confirmationCode: `CODE00${id}`,
    status,
    requestedAt: '2026-07-29T11:45:00Z',
    expiresAt,
    confirmedAt: status === 'Confirmed' ? '2026-07-29T11:50:00Z' : null,
  };
}

describe('Redemptions presentation helpers', () => {
  it('sorts realistic requests with pending first and preserves order within statuses', () => {
    const items = [
      request('Expired', '1'),
      request('Pending', '2'),
      request('Cancelled', '3'),
      request('Confirmed', '4'),
      request('Pending', '5'),
    ];

    expect(sortRedemptionRequests(items).map((item) => item.id))
      .toEqual(['2', '5', '4', '1', '3']);
  });

  it('describes pending and expired deadlines relatively', () => {
    expect(redemptionExpiryLabel(request('Pending', '1'), now)).toBe('Expires in 6 min');
    expect(redemptionExpiryLabel(
      request('Expired', '2', '2026-07-29T10:00:00Z'),
      now,
    )).toBe('Expired 2 hours ago');
    expect(redemptionExpiryLabel(request('Confirmed', '3'), now)).toBeNull();
    expect(redemptionExpiryLabel(request('Cancelled', '4'), now)).toBeNull();
  });
});
