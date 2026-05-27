import { useEffect, useMemo, useState } from 'react';
import { getLuxurySelection, subscribeLuxurySelection } from '../cart/luxuryCartState';

export function useLuxuryCart() {
  const [items, setItems] = useState(getLuxurySelection);
  useEffect(() => subscribeLuxurySelection(setItems), []);
  const total = useMemo(() => items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0), [items]);
  const quantity = useMemo(() => items.reduce((sum, i) => sum + (i.quantity || 0), 0), [items]);
  return { items, total, quantity };
}
