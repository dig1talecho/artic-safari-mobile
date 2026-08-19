import { useEffect, useState } from "react";
import { isLoyaltyAvailable } from "../services/loyalty";

/**
 * `null` while the answer is unknown.
 *
 * Screens treat null as "not yet" rather than "no", so a tab does not
 * flash into view and disappear again on a slow connection.
 */
export function useLoyaltyAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    isLoyaltyAvailable().then((yes) => {
      if (active) setAvailable(yes);
    });
    return () => {
      active = false;
    };
  }, []);

  return available;
}
